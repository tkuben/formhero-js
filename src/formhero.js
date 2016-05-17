/**
 * Copyright 2016 FormHero Inc. All rights reserved
 *
 * This software is the property of FormHero Inc (FormHero) which specifically
 * grants the user the right to modify, use and distribute this software
 * provided this notice is not removed or altered.  All other rights are
 * reserved by FormHero.
 *
 * FORMHERO MAKES NO WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, WITH REGARD TO
 * THIS SOFTWARE.  IN NO EVENT SHALL FOMRHERO BE LIABLE FOR INDIRECT, SPECIAL,
 * INCIDENTAL OR CONSEQUENTIAL DAMAGES IN CONNECTION WITH OR ARISING FROM
 * THE FURNISHING, PERFORMANCE, OR USE OF THIS SOFTWARE.
 *
 * So that all may benefit from your experience, please report any problems
 * or suggestions about this software to FormHero Support Services by
 * e-mail at info@formhero.io .
 *
 * FormHero Inc.
 * 1077 Regional Road 97
 * Puslinch, ON
 * N0B 2J0
 * Canada
 *
 */


 /*
 * Created by ryankimber on 15-02-12.
 *
 * 2015-11-15 22:10 - changed styling for modal box.
 * 2015-11-16 09:56 - overlay and iframe fade in.
 * 2016-03-10 21:00 - refactored into it's own project.
 */
var formhero = (function (api) {

    var deferClosingToFormHeroUi = false;
    var formCount = 0;
    var modalCloseRequests = {};

    window.addEventListener('message', function(event) {
        console.log("FormHero.js received: ", event);

        try {
            //We expect JSON, and we expect a frame ID in the message.
            var fhMessage = event.data;
            if(fhMessage.iframeId)
            {
                if(modalCloseRequests[fhMessage.iframeId]) {
                    if(fhMessage.result == 'cancel')
                    {
                        delete modalCloseRequests[fhMessage.iframeId];
                    }
                    else if (fhMessage.result == 'close')
                    {
                        modalCloseRequests[fhMessage.iframeId]();
                        delete modalCloseRequests;
                    }
                }
            }

            if(fhMessage.deferClosing)
            {
                console.log("Deferring close requests for formhero-ui");
                deferClosingToFormHeroUi = true;
            }
            else {
                console.log("No longer deferring close requests to formhero-ui");
                deferClosingToFormHeroUi = false;
            }
        }
        catch(e)
        {
            //unable to parse the message, I guess. Not much to be done about that.
            console.error("Unexpected/improperly formatted message received:", e);
        }
    }, false);

    function addCssFile(filename){

        var fileref=document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
        if (typeof fileref!="undefined") document.getElementsByTagName("head")[0].appendChild(fileref)
    }

    addCssFile("https://formhero.io/lib/formhero.css");

    api.loadToModal = function(options) {
        /* If the caller wanted to pass data into the form, we could accept it here and post it to
         one of our services. The service could save the data with a dynamic encryption key that we create here.
         Then, on we could pass the key to the iframe, making that record essentially, a one-time use bit of data.
         */

        /* We could probably search for a data-form-hero attribute in the page and attach that way */
        /* Or, for modal, we can just respond to an event or get called directly. */

        /*
         Options should contain:
         - the formhero formID
         - we need to decide how the user wants the form attached - as an iFrame in a div, or as a popover.
         */

        /* If we find the element that they want to use, we can check if it has an attribute for fh-form-id,
         if it doesn't we check the options object for formId.

         Eventually, it might be nice for the address to be https://<org>.formhero.io/#/<formId>
         */

        /**
         * It should be noted that this library intentionally avoids jQuery and other 3rd-party library  usage to keep our size small,
         * our code fast, and to ensure that we don't have collisions with libraries that the user has loaded in their page.
         */

        if(typeof options === 'undefined' || typeof options.formId === 'undefined' || typeof options.organizationId === 'undefined')
        {
            console.error("You must pass an options object with an organizationId  and a formId when calling formHero.");
            return;
        }

        /*
           FORMHERO-191
             Two things to check.
                1) If the screen is small, just use a new tab because it's easier and we can be sure of the user experience
                2) If it's iOS, use a new tab regardless, as, as of iOS 9, iOS iframe's don't scroll and aren't responsive.
                   They actually scale the viewport to include 100% of the content without scrolling.
         */
        var isMobileSize = window.matchMedia("only screen and (max-width: 760px)").matches;
        var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        /**
         * Options Object
         * {
         *      organizationId: orgId
         *      formId : <formId>, //optional,
         *      formData : <seed data object>, //Optionally pre-populate the form data object with known data.
         *      oncomplete : <callbackFnHandle>, //Optional callback function on form completion with formData as an argument
         *      onchange : <callbackFnHandle>, //Optional callback function called each time form data changes with formData as an argument
         *      overlay : true/false, //Creates an overlay behind the modal, defaults to true.
         *      overlayColor : <overlayColor>, //Optional, using rgba format allows transparency
         * }
         */
        var formId = options.formId;
        var protocol = 'https://';
	var formheroHost = 'formhero.io';
    if(typeof FORMHERO_PROTOCOL != 'undefined')
    {
        protocol = FORMHERO_PROTOCOL;
    }

	if(typeof FORMHERO_HOST != 'undefined') {
       formheroHost = FORMHERO_HOST;
    }
        var formUrl = [protocol,
            		encodeURIComponent(options.organizationId),
            		'.',
			formheroHost, 
			'/#/start/', 
            		encodeURIComponent(options.team), 
			'/', 
            		encodeURIComponent(options.formId), 
			'?new=true'].join('');

        if(isMobileSize || isIOS)
        {
            //Open in a new tab
            window.open(formUrl, "_blank");
        }
        else
        {
            var overlay = document.createElement('div');
            overlay.id = 'formhero-overlay-' + formCount;
            overlay.className = 'formhero-overlay hidden';
            overlay.style.backgroundColor = 'transparent';
            document.body.appendChild(overlay);

            var originalOverflowSetting = document.body.style.overflow;

            document.body.style.overflow = 'hidden';


            var iframeContainer = document.createElement('div');

            iframeContainer.id = 'formhero-iframe-wrapper-' + formCount;
            iframeContainer.className = 'formhero-iframe-wrapper hidden';


            var iframe = document.createElement('iframe');
            iframe.className = 'formhero-iframe';

            iframe.id = 'form-frame-' + formCount;
            iframe.src = formUrl + '&mode=modal';
            iframe.frameborder = 0;
            //iframe.scrolling = 'no';

            var closeButton = document.createElement('div');
            closeButton.className = 'formhero-close-button';

            iframe.frameBorder = "0";
            iframe.allowTransparency="true";

            iframeContainer.appendChild(getSvgContainerElement());
            iframeContainer.appendChild(closeButton);
            iframeContainer.appendChild(iframe);
            closeButton.addEventListener("click", function() {

                if(deferClosingToFormHeroUi) {
                    //Register a handler in modalCloseRequests
                    modalCloseRequests[iframe.id] = function () {
                        overlay.className = 'formhero-overlay hidden'; //remove hidden
                        iframeContainer.className = 'formhero-iframe-wrapper hidden'; //remove hidden
                        setTimeout(function () {
                            console.log("Destroying formhero overlay and iframe container...");
                            document.body.removeChild(overlay);
                            document.body.removeChild(iframeContainer);
                            document.body.style.overflow = originalOverflowSetting;
                        }, 2000);
                    };
                    //Send a message to our child frame that the user has asked to close it.
                    _sendMessageToIframe(iframe, {
                        type: 'formhero-js-request',
                        request: 'modalClose',
                        iframeId: iframe.id
                    });
                }
                else
                {
                    overlay.className = 'formhero-overlay hidden'; //remove hidden
                    iframeContainer.className = 'formhero-iframe-wrapper hidden'; //remove hidden
                    setTimeout(function () {
                        console.log("Destroying formhero overlay and iframe container...");
                        document.body.removeChild(overlay);
                        document.body.removeChild(iframeContainer);
                        document.body.style.overflow = originalOverflowSetting;
                    }, 2000);
                }
            });

            document.body.appendChild(iframeContainer);
            formCount++;

            setTimeout(function(){
                overlay.className = 'formhero-overlay visible'; //remove hidden
                iframeContainer.className = 'formhero-iframe-wrapper visible'; //remove hidden
            }, 10);
        }
    };

    function _sendMessageToIframe(iframe, message)
    {
        iframe.contentWindow.postMessage(message, '*');
    }

    function getSvgContainerElement()
    {
        var bodyElement = document.createElement('div');
        bodyElement.className = 'spinner-container';
        bodyElement.appendChild(getSvgElement());
        return bodyElement;
    }

    function getSvgElement()
    {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        svg.appendChild(circle);
        circle.setAttribute('class', 'path');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke-width', 10);
        circle.setAttribute('stroke-linecap', 'round');
        circle.setAttribute('cx', 66);
        circle.setAttribute('cy', 66);
        circle.setAttribute('r', 60);

        svg.setAttribute('class', 'spinner');
        svg.setAttribute('width', '130px');
        svg.setAttribute('height', '130px');
        svg.setAttribute('viewBox', "0 0 131 131");

        return svg;
    }

    return api;
}(formhero || {}));

if(typeof angular != 'undefined') {
    try{
        angular.module('formhero', []).factory('formhero', function(){
            return formhero;
        })
    }
    catch(e) {
        //nevermind, this probably isn't really angular.
        console.error("Unable to register formhero module in angular due to exception:", e);
    }
}


