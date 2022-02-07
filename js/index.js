document.addEventListener('DOMContentLoaded', function (e) {
    let dataManager = createDataManager();
    let speaker;

    let isPlaying = false;
    let currPrompt;
    let currCallback;

    function init() {
        if (!window.speechSynthesis) {
            alert("This broswer is not capable of running this application.")
            return;
        }

        if (!dataManager.isInitialized()) {
            fetch('flashcardFile.txt')
                .then(response => response.text())
                .then(text => {
                    dataManager.initialize(text);
                    // wait for the init to finish then run this function again.
                    speaker = createSpeaker(dataManager.getLang1(), dataManager.getLang2());
                });
        } else {
            speaker = createSpeaker(dataManager.getLang1(), dataManager.getLang2());
        }

        setEventHandlers();
    }

    function next() {
        if (!currPrompt || !currPrompt.responseHidden()) {
            // get a new card
            currPrompt = new PromptCardWrapper(dataManager.getRandomFlashCard(), speaker, dataManager);

            $("#cards-div").append(currPrompt.element);

            if ($("#cards-div").children().length > 10) {
                $("#cards-div").children().first().remove();
            }

            next();
        } else if (currPrompt.promptHidden()) {
            let waitResponseCallback = new CallbackWrapper(() => { next() });

            let waitPromptCallback = new CallbackWrapper(() => {
                currCallback = waitResponseCallback;
                currPrompt.showPrompt();
                currPrompt.waitResponse(waitResponseCallback);
            })

            let promptCallback = new CallbackWrapper(() => {
                currCallback = waitPromptCallback;
                currPrompt.waitPrompt(waitPromptCallback);
            });

            currCallback = promptCallback;
            currPrompt.speakPrompt(promptCallback);
        } else if (currPrompt.responseHidden()) {
            let wait3SecondsCallback = new CallbackWrapper(() => { next() });

            let responseCallback = new CallbackWrapper(() => {
                currPrompt.showResponse()

                currCallback = wait3SecondsCallback;
                setTimeout(() => { wait3SecondsCallback.call() }, 3000)
            });

            currCallback = responseCallback
            currPrompt.speakResponse(responseCallback);
        }
    }

    function pauseClicked() {
        if (currCallback) currCallback.cancel();
        speaker.stopSpeaking();

        if (currPrompt) {
            if (currPrompt.promptHidden()) currPrompt.showPrompt();
            else if (currPrompt.responseHidden()) currPrompt.showResponse();
        }
    }

    function playClicked() {
        if (currCallback) currCallback.cancel();
        speaker.stopSpeaking();
        next();
    }

    function showSettings() {
        let voices = speaker.getVoices();

        let l1 = $("#lang1-select");
        let l2 = $("#lang2-select");

        l1.empty();
        l2.empty();

        voices.forEach(voice => {
            l1.append($("<option />").val(voice.voiceURI).text(voice.name));
            l2.append($("<option />").val(voice.voiceURI).text(voice.name));
        })

        if (dataManager.isInitialized()) {
            l1.val(dataManager.getLang1());
            l2.val(dataManager.getLang2());
        }

        $("#settings-menu").show();
    }

    function closeSettings() {
        $("#settings-menu").hide();
    }

    function setEventHandlers() {
        $("#settings-button").on("click", function () { showSettings() })
        $("#close-settings-menu-button").on("click", function () { closeSettings(); })

        $("#lang1-select").on("change", () => {
            speaker.setLang1($("#lang1-select").val())
            dataManager.setLang1($("#lang1-select").val())
        });

        $("#lang2-select").on("change", (ev) => {
            speaker.setLang2($("#lang2-select").val())
            dataManager.setLang2($("#lang2-select").val())
        });

        $("#play-pause-button").on("click", () => {
            if (isPlaying) {
                isPlaying = false;
                $("#play-pause-button-pause").hide();
                $("#play-pause-button-play").show();
                pauseClicked()
            } else {
                isPlaying = true;
                $("#play-pause-button-play").hide();
                $("#play-pause-button-pause").show();
                playClicked();
            }
        });

        $("#play-pause-button-pause").hide();
    }

    function CallbackWrapper(callbackFunc) {
        this.cancelled = false;
        this.call = function () { if (!this.cancelled) callbackFunc(); };
        this.cancel = function () { this.cancelled = true; }
    }

    function PromptCardWrapper(cardData, speaker, dataManager) {
        this.scoreIndex = -1;

        this.promptText = cardData.is12 ? cardData.card.lang1 : cardData.card.lang2;
        this.responseText = cardData.is12 ? cardData.card.lang2 : cardData.card.lang1;

        this.speakPrompt = function (callback) {
            let speakFunc = cardData.is12 ? speaker.speakLang1 : speaker.speakLang2;
            speakFunc(this.promptText).then(() => { callback.call(); });
        }

        this.speakResponse = function (callback) {
            let speakFunc = cardData.is12 ? speaker.speakLang2 : speaker.speakLang1;
            speakFunc(this.responseText).then(() => { callback.call(); });
        }

        this.waitPrompt = function (callback) {
            let waitFunc = cardData.is12 ? speaker.waitForSpeechLengthLang1 : speaker.waitForSpeechLengthLang2;
            waitFunc(this.promptText).then(() => { callback.call(); });
        };

        this.waitResponse = function (callback) {
            let waitFunc = cardData.is12 ? speaker.waitForSpeechLengthLang2 : speaker.waitForSpeechLengthLang1;
            waitFunc(this.responseText).then(() => { callback.call(); });
        };


        this.promptHidden = function () {
            let prompt = this.element.find(".card-prompt").first();
            return prompt.css('opacity') == 0;
        }

        this.responseHidden = function () {
            let response = this.element.find(".card-response").first();
            return response.css('opacity') == 0;
        }

        this.showPrompt = function () {
            let prompt = this.element.find(".card-prompt").first();
            prompt.fadeTo(0.5, 1)
        }

        this.showResponse = function () {
            let response = this.element.find(".card-response").first();
            response.fadeTo(0.5, 1)
        }

        this.scoreClickCallback = function (index, clickedButton) {
            if (this.scoreIndex != -1) {
                this.element
                    .find(".scores-div").first()
                    .find(".selected").first()
                    .removeClass('selected');
                dataManager.decrementScore(cardData.card.id, this.scoreIndex, cardData.is12);
            }

            this.scoreIndex = index;

            clickedButton.addClass("selected");
            dataManager.incrementScore(cardData.card.id, index, cardData.is12);
        }

        function createFlashcardCard(promptText, responseText, scoreClickedCallback) {
            let card = $("<div />");
            card.addClass("card");

            let prompt = $("<p />");
            prompt.addClass('card-prompt');
            prompt.html(promptText);
            prompt.css('opacity', '0');
            card.append(prompt);

            let response = $("<p />");
            response.addClass('card-response');
            response.html(responseText);
            response.css('opacity', '0');
            card.append(response);

            let scoresDiv = $("<div />");
            scoresDiv.addClass('scores-div')
            card.append(scoresDiv);

            let scores = [
                SCORE_GREAT_INDICATOR,
                SCORE_GOOD_INDICATOR,
                SCORE_AVERAGE_INDICATOR,
                SCORE_BAD_INDICATOR,
                SCORE_TERRIBLE_INDICATOR
            ]

            for (let i = 0; i < scores.length; i++) {
                let div = $("<div />");
                div.attr("score_index", i);
                div.addClass('button-div');
                div.addClass('feedback-button');
                div.html(scores[i])
                div.on('click', () => { scoreClickedCallback(i, div); });
                scoresDiv.append(div);
            }

            return card;
        }

        this.element = createFlashcardCard(
            this.promptText,
            this.responseText,
            (i, d) => { this.scoreClickCallback(i, d) });
    }

    init()
});