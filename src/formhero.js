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
 * 600 - 10 Dundas Street East c/o DMZ
 * Toronto, ON
 * M5G 2B9
 * Canada
 *
 */


 /*
 * Created by ryankimber on 15-02-12.
 *
 * 2015-11-15 22:10 - changed styling for modal box.
 * 2015-11-16 09:56 - overlay and iframe fade in.
 * 2016-03-10 21:00 - refactored into it's own project.
 * 2016-09-28 22:00 - add setFormHeroHost and useHttps methods
 */
var formhero = (function (api) {

    var deferClosingToFormHeroUi = false;
    var formCount = 0;
    var callbackRegistry = {};

    ${hostOverride}

    function getFormHeroServicesUrl() {
        var formheroHost = 'formhero.io';
        var protocol = 'https://';
        var formheroHost = 'formhero.io';
        if(typeof FORMHERO_PROTOCOL != 'undefined')
        {
            protocol = FORMHERO_PROTOCOL;
        }

        if(typeof FORMHERO_HOST != 'undefined') {
            formheroHost = FORMHERO_HOST;
        }

        return protocol + 'services.' + formheroHost;
    }

    function flatMapper(objectData, pair)
    {
        if (pair.key.indexOf('.') != -1) {
            var attrs = pair.key.split('.');

            for (var i = 0; i < attrs.length; i++) {
                if (objectData[attrs[i]] == undefined) objectData[attrs[i]] = {};
                if(i == attrs.length - 1) //we're at the end, set a value
                {
                    objectData[attrs[i]] = pair.value;
                }
                else objectData = objectData[attrs[i]];
            }

            //objectData[pair.key] = objectData[pair.value];

        } else {
            if (objectData[pair.key] != null) {
                if (!objectData[pair.key].push) {
                    objectData[pair.key] = [objectData[pair.key]];
                }

                objectData[pair.key].push(pair.value);
            } else {
                objectData[pair.key] = pair.value;
            }
        }
    }

    function htmlToElement(html) {3
        var template = document.createElement('template');
        template.innerHTML = html;
        return template.content.firstChild;
    }


    api.convertMapToObject = function(flatData) {
        var objectData = {};


        for(var propertyName in flatData) {
            // propertyName is what you want
            // you can get the value like this: myObject[propertyName]
            if(propertyName && propertyName.indexOf('$') == -1) {
                flatMapper(objectData, {key: propertyName, value: flatData[propertyName]});
            }
        }
        return objectData;
    };

    api.setFormHeroHost = function(host)
    {
        FORMHERO_HOST = host;
    };

    api.useHttps = function(useHttps)
    {
        if(useHttps) FORMHERO_PROTOCOL = "https://";
        else FORMHERO_PROTOCOL = "http://";
    };

    window.addEventListener('message', function(event) {
        console.log("FormHero.js received: ", event);

            // closeHandler: closeHandlerFn || function() {},
            // onFormSuccess: resolve,
            // onFormCancel: reject,
            // isSettled: false

        try {
            //We expect JSON, and we expect a frame ID in the message.
            var fhMessage = event.data;
            if(!fhMessage.iframeId && Object.keys(callbackRegistry).length == 1)
            {
                fhMessage.iframeId = Object.keys(callbackRegistry)[0];
            }

            //Notification about the state of the form.
            if(fhMessage.fhResult)
            {
                if(callbackRegistry[fhMessage.iframeId])
                {
                    callbackRegistry[fhMessage.iframeId].isSettled = true;
                    if(fhMessage.fhResult && fhMessage.fhResult.state === 'form-success')
                    {
                        try {
                            document.querySelector('div.formhero-button-panel span.fh-button.fh-save').style.display = 'none';
                            document.querySelector('div.formhero-button-panel span.fh-button.fh-cancel').style.display = 'none';
                            document.querySelector('div.formhero-button-panel span.fh-button.fh-close').style.display = 'block';
                        }
                        catch(e) {}

                        fhMessage.fhResult.submittedAt = JSON.stringify(new Date());
                        callbackRegistry[fhMessage.iframeId]['onFormSuccess'](fhMessage.fhResult);
                    }
                    else {
                        callbackRegistry[fhMessage.iframeId]['onFormCancel'](fhMessage.fhResult);
                    }
                }
            }
            //Notification specifically about closing the dialog
            if(fhMessage.iframeId && (fhMessage.closeRequestResult || fhMessage.result))
            {
                if(callbackRegistry[fhMessage.iframeId]) {
                    if(fhMessage.closeRequestResult == 'cancel')
                    {
                        console.log("The user cancelled their close request...");
                    }
                    else if (fhMessage.closeRequestResult == 'close' || fhMessage.result == 'close')
                    {
                        callbackRegistry[fhMessage.iframeId].closeModal(fhMessage.buttonAction);
                        callbackRegistry[fhMessage.iframeId].closeHandler(fhMessage.buttonAction);
                        if(callbackRegistry[fhMessage.iframeId].isSettled) {
                            delete callbackRegistry[fhMessage.iframeId];
                        }
                    }
                }
            }

            if(fhMessage.deferClosing)
            {
                deferClosingToFormHeroUi = true;
            }
            else {
                deferClosingToFormHeroUi = false;
            }
        }
        catch(e)
        {
            //unable to parse the message, I guess. Not much to be done about that.
            console.error("Unexpected/improperly formatted message received:", e);
        }
    }, false);

    function createSession(options, dataMap) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();

            xhr.open('POST', getFormHeroServicesUrl() + '/auth/session/init');
            xhr.withCredentials = false;
            xhr.onload = function() {
                if (xhr.status === 200 && xhr.responseText) {
                    resolve(JSON.parse(xhr.responseText))
                }
                else if (xhr.status !== 200) {
                    reject(xhr.status);
                }
            };
            xhr.onerror = function() {
                reject();
            };

            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                org: options.organization,
                team: options.team,
                slug: options.form,
                fieldData: dataMap,
                cname: options.cname
            }));
        });

    }

    function addCssFile(filename){

        var fileref=document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", filename);
        if (typeof fileref!="undefined") document.getElementsByTagName("head")[0].appendChild(fileref);
    }



    addCssFile("https://use.formhero.io/${deploy.path}/formhero.css");

    /**
     * Options Object
     * {
     *      organization: orgId
     *      form : <form>, //optional,
     *      overlay : true/false, //Creates an overlay behind the modal, defaults to true.
     *      overlayColor : <overlayColor>, //Optional, using rgba format allows transparency
     *
     *  }
     *
     *  dataMap object: optional map of key: value pairs that will be used to pre-populate the form. Fields not used in the form
     *                  will still be transmitted when the form is submitted, and can be used to drive branch choices, populate PDF fields, etc.
     *
     *  Returns a Promise that resolves if the user successfully completes the form, rejects if the user elects not to complete the form, and throws
     *  an exception if there's an error when trying to load / submit the form.
     *
     *  Result Object Structure:
     *
     *      On Successful form completion:
     *          {
     *             formDialogOpen: true | false, //indicates whether or not the form dialog is still open
     *             closeDialog: method you can call to close the dialog if it isn't already closed.
     *             collectedData: map of key: value pairs from the completed form flow
     *             path: array of objects indicating the user's path through the formflow, each of which includes the uuid and label of the nodes on the path,
     *             generatedResources: array of URIs that can be used to retrieve resources generated when the form was completed. These links are valid for just 5 minutes.
     *             formHeroToken: the JWT token that must be passed as a header (X-Formhero-Token) to retrieve any of the generated resources
     *          }
     *
     *     On rejected form completion:
     *        {
     *            formDialogOpen: true | false, //indicates whether or not the form dialog is still open,
     *            formState: description, //String description of the form state, i.e: 'discarded', 'saved-for-later',
     *            collectedData: map of key: value pairs (what data was collected from the user)
     *            path: array of objects indicating the user's path through the formflow, each of which includes the uuid and label of the nodes on the path
     *        }
     *
     *     Exception Thrown on Error
     *        {
     *           formError: {
     *              message: a bit of info that should help to explain the error
     *              status: server status message (if applicable)
     *           },
     *           collectedData: map of key: value pairs from the completed form flow
     *           path: array of objects indicating the user's path through the formflow, each of which includes the uuid and label of the nodes on the path
     *        }
     */
    api.loadForm = function(options, dataMap, onCloseFn) {

        var closeHandlerFn = onCloseFn || options.onCloseFn;

        return new Promise(function(resolve, reject) {
            /* if the user calls us with a data map, we create a session on the server, grab the JWT token and then ensure the
               token is included in the URL when we load the form. The FormHeroUI then looks after loading the data when the form kicks off.
             */

            /* We could probably search for a data-form-hero attribute in the page and attach that way */
            /* Or, for modal, we can just respond to an event or get called directly. */

            /**
             * It should be noted that this library intentionally avoids jQuery and other 3rd-party library  usage to keep our size small,
             * our code fast, and to ensure that we don't have collisions with libraries that the user has loaded in their page.
             */

            if(typeof options === 'undefined' || typeof options.form === 'undefined' || typeof options.organization === 'undefined')
            {
                console.error("You must pass an options object with an organization  and a form when calling formHero.");
                return;
            }

            var form = options.form;
            var protocol = 'https://';
            var formheroHost = 'formhero.io';
            if(typeof FORMHERO_PROTOCOL != 'undefined')
            {
                protocol = FORMHERO_PROTOCOL;
            }

            if(typeof FORMHERO_HOST != 'undefined') {
                formheroHost = FORMHERO_HOST;
            }

            //If the caller has configured a CNAME, use the CNAME instead of our <org>.formhero.io host URL
            if(options.cname) {
                formheroHost = options.cname;
            }
            else {
                formheroHost = encodeURIComponent(options.organization) + '.' + formheroHost;
            }

            var modeParam = '';

            if(options.mode)
            {
                modeParm = '&mode=' + modeParam;
            }
            var formUrl = [
                protocol,
                formheroHost,
                '/#/start/',
                encodeURIComponent(options.team),
                '/',
                encodeURIComponent(options.form),
                '?new=true',
                modeParam
            ].join('');

            var formFrameIdentifier = 'form-frame-' + formCount;
            callbackRegistry[formFrameIdentifier] = {
                closeHandler: closeHandlerFn || function() {},
                onFormSuccess: resolve,
                onFormCancel: reject,
                isSettled: false
            };


            if(dataMap) {
                createSession(options, dataMap).then(
                    function(response) {
                        formUrl += '&jwt=' + response.jwt;
                        console.log("Loading iframe with " + formUrl);
                        loadForm(formUrl, formFrameIdentifier, options).then(resolve, reject);
                    },
                    function() {

                    }
                );
            }
            else {
                console.log("Loading iframe with " + formUrl);
                loadForm(formUrl, formFrameIdentifier, options).then(resolve, reject);
            }
        });
    };

    function loadForm(formUrl, formFrameIdentifier, options) {

        return new Promise(function(resolve, reject) {
            /*
             FORMHERO-191
             Two things to check.
             1) If the screen is small, just use a new tab because it's easier and we can be sure of the user experience
             2) If it's iOS, use a new tab regardless, as, as of iOS 9, iOS iframe's don't scroll and aren't responsive.
             They actually scale the viewport to include 100% of the content without scrolling.
             */
            //var isMobileSize = window.matchMedia("only screen and (max-width: 760px)").matches;

            formUrl += '&iframeId=' + formFrameIdentifier;

            //If we treat iOS / small devices differently here, we will break our messaging system. It's much
            //harder for us to message cross-domain if we don't have iframes involved.

            //var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            //if (isMobileSize || isIOS) {
                //Open in a new tab
            //    window.open(formUrl, "_blank");
           ///}
            if(true) { //else {
                var scrollTop = document.body.scrollTop;
                document.body.classList.add('formhero-scroll-block');

                var overlay = document.createElement('div');
                overlay.id = 'formhero-overlay-' + formCount;
                overlay.className = 'formhero-overlay hidden';

                document.body.appendChild(overlay);

                                // var originalHtmlOverflowSetting = document.documentElement.style.overflow;
                // var originalBodyOverflowSetting = document.body.style.overflow;
                //
                // document.documentElement.style.overflow = 'hidden';
                // document.body.style.overflow = 'hidden';


                var iframeContainer = document.createElement('div');

                iframeContainer.id = 'formhero-iframe-wrapper-' + formCount;
                iframeContainer.className = 'formhero-iframe-wrapper hidden';

                var iframe = document.createElement('iframe');
                iframe.className = 'formhero-iframe';

                iframe.id = 'form-frame-' + formCount;
                iframe.name = 'form-frame-' + formCount;
                iframe.src = formUrl + '&viewMode=modal';
                iframe.frameborder = 0;

                var cancelButtonMarkup = options.cancelButtonMarkup || '<div class="formhero-cancel-button"><i class="fa fa-trash-o"></i>Cancel</div>';
                var closeButtonMarkup = options.closeButtonMarkup || '<div class="formhero-cancel-button"><i class="fa fa-close"></i>Close</div>';
                var saveButtonMarkup = options.saveButtonMarkup || '<div class="formhero-save-button"><i class="fa fa-save"></i>Save &amp; Close</div>';

                var buttonPanelElement = htmlToElement('<div class="formhero-button-panel"></div>');
                var cancelButtonElement = htmlToElement('<span class="fh-button fh-cancel">' + cancelButtonMarkup + '</span>');
                var closeButtonElement = htmlToElement('<span class="fh-button fh-close" style="display:none;">' + closeButtonMarkup + '</span>');
                var saveButtonElement = htmlToElement('<span class="fh-button fh-save">' + saveButtonMarkup + '</span>');
                buttonPanelElement.appendChild(saveButtonElement);
                buttonPanelElement.appendChild(cancelButtonElement);
                buttonPanelElement.appendChild(closeButtonElement);



                iframe.frameBorder = "0";
                iframe.allowTransparency = "true";

                iframeContainer.appendChild(getSvgContainerElement());
                //Ensure we remove the spinner once the iframe has loaded.
                iframe.onload = function () {
                        var spinner = document.getElementById('fh-spinner');
                    spinner.parentNode.removeChild(spinner);
                };

                iframeContainer.appendChild(buttonPanelElement);
                iframeContainer.appendChild(iframe);



                callbackRegistry[formFrameIdentifier].closeModal = function () {
                    overlay.className = 'formhero-overlay hidden'; //remove hidden
                    iframeContainer.className = 'formhero-iframe-wrapper hidden'; //remove hidden
                    setTimeout(function () {
                        document.body.removeChild(overlay);
                        document.body.removeChild(iframeContainer);
                        if(document.body.classList.contains('formhero-scroll-block')) document.body.classList.remove('formhero-scroll-block');
                        document.body.scrollTop = scrollTop;
                        //document.documentElement.style.overflow = originalHtmlOverflowSetting;
                        //document.body.style.overflow = originalBodyOverflowSetting;
                    }, 100);
                };


                var buttonHandler = function(buttonAction) {
                    if(callbackRegistry[formFrameIdentifier].isSettled)
                    {
                        callbackRegistry[formFrameIdentifier].closeModal(buttonAction);
                        callbackRegistry[formFrameIdentifier].closeHandler(buttonAction);
                    }
                    else {
                        //Send a message to our child frame that the user has asked to close it.
                        _sendMessageToIframe(iframe, {
                            type: 'formhero-js-request',
                            request: 'modalClose',
                            buttonAction: buttonAction,
                            iframeId: formFrameIdentifier
                        });
                    }
                }

                closeButtonElement.addEventListener("click", function () { buttonHandler('close-after-submit')});
                cancelButtonElement.addEventListener("click", function() { buttonHandler('cancel-without-save')});
                saveButtonElement.addEventListener("click", function() { buttonHandler('close-and-save')});

                document.body.appendChild(iframeContainer);
                formCount++;

                setTimeout(function () {
                    overlay.className = 'formhero-overlay visible'; //remove hidden
                    iframeContainer.className = 'formhero-iframe-wrapper visible'; //remove hidden
                }, 100);
            }
        })
    }

    function _sendMessageToIframe(iframe, message)
    {
        iframe.contentWindow.postMessage(message, '*');
    }

    function getSvgContainerElement()
    {
        var bodyElement = document.createElement('div');
        bodyElement.id = 'fh-spinner';
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

    window.onload = function() {
        //Look for elements that have formhero attributes and add on-click handlers.
        var fhFormTargets= document.querySelectorAll('[fh-form]');

        for(var i = 0; i < fhFormTargets.length; i++)
        {
            var formTarget = fhFormTargets[i];
            if((formTarget.getAttribute('fh-organization') || formTarget.getAttribute('fh-org')) && formTarget.getAttribute('fh-team'))
            {
                formTarget.style.cursor = 'pointer';
                formTarget.addEventListener('click', function(event) {

                    if(event.preventDefault) event.preventDefault();
                    api.loadForm({
                       organization: formTarget.getAttribute('fh-organization') || formTarget.getAttribute('fh-org'),
                       team: formTarget.getAttribute('fh-team'),
                       form: formTarget.getAttribute('fh-form')
                    });
                    return false;
                });
            }
            else console.error("Found element with an fh-form attribute, but it is missing fh-organization, fh-team, or the value for fh-organization, unable to attach event handler for this element:", formTarget);
        }

    };

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


