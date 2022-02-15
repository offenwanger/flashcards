document.addEventListener('DOMContentLoaded', function (e) {
    let dataManager = createDataManager();
    let speaker;

    let currPrompt;

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

    function nextClicked() {
        speaker.stopSpeaking();

        if (!currPrompt || !currPrompt.responseHidden()) {
            // if we're on the first prompt or the response is showing, get a new card. 
            // get a new card
            currPrompt = new PromptCardWrapper(dataManager.getRandomFlashcard(), speaker, dataManager);

            $("#cards-div").append(currPrompt.element);

            if ($("#cards-div").children().length > 10) {
                $("#cards-div").children().first().remove();
            }

            $("#cards-div").animate({
                scrollTop: $('#cards-div')[0].scrollHeight
            }, 1000);

            currPrompt.speakPrompt();
        } else if (currPrompt.promptHidden()) {
            // if the prompt is not showing, show the prompt. 
            currPrompt.showPrompt();
        } else if (currPrompt.responseHidden()) {
            currPrompt.showResponse();
            currPrompt.speakResponse();
        }
    }
    
    function repeatClicked() {
        speaker.stopSpeaking();

        if(currPrompt) {
            if (currPrompt.responseHidden()) {
                currPrompt.speakPrompt();
            } else {
                currPrompt.speakResponse();
            }
        }
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

    function hideSettings() {
        $("#settings-menu").hide();
    }

    function fileUploaded(event) {
        var input = event.target;

        var reader = new FileReader();
        reader.onerror = function(event) {
            alert("Failed to read file!\n\n" + reader.error);
        };
        reader.onload = function(){
          let text = reader.result;
          let result = dataManager.parseTxtFile(text);
          console.log(result);
        };
        reader.readAsText(input.files[0]);
    }

    function showFlashcards(flashcardData) {
        let cardDisplay = $("#cards-display-div")
        cardDisplay.empty();

        flashcardData.forEach(flashcard=> {
            let card = createFlashcardCardDisplay(flashcard);
            cardDisplay.append(card);
        });

        $("#flashcard-display").show();
    }
    
    function createFlashcardCardDisplay(flashcardData) {
        let card = $("<div />");
        card.addClass("card");

        let prompt = $("<p />");
        prompt.html(flashcardData.lang1);
        card.append(prompt);

        let response = $("<p />");
        response.html(flashcardData.lang2);
        card.append(response);

        let scoresDiv = $("<div />");
        scoresDiv.addClass('scores-div')
        scoresDiv.html(
            "Score 1-2: " + 
            dataManager.scoreToString(flashcardData.score12) + 
            "<br>" +
            "Score 2-1: " + 
            dataManager.scoreToString(flashcardData.score21));
        card.append(scoresDiv);

        return card;
    }

    function setEventHandlers() {
        $("#logo").on("click", function () { location.href = 'https://offenwanger.ca'; })
        $("#app-title").on("click", function () { location.href = 'https://offenwanger.ca'; })

        $("#settings-button").on("click", function () { showSettings() })
        $("#close-settings-menu-button").on("click", function () { hideSettings(); })

        $("#lang1-select").on("change", () => {
            speaker.setLang1($("#lang1-select").val())
            dataManager.setLang1($("#lang1-select").val())
        });

        $("#lang2-select").on("change", (ev) => {
            speaker.setLang2($("#lang2-select").val())
            dataManager.setLang2($("#lang2-select").val())
        });

        $("#next-button").on("click", () => {
            nextClicked();
        });

        $("#repeat-button").on("click", () => {
            repeatClicked();
        });

        $("#add-flashcards").on("click", () => {

        });

        $("#view-flashcards").on("click", () => {
            hideSettings();
            showFlashcards(dataManager.getAllFlashcards());
        });
        $("#close-flashcard-display-button").on("click", function () { $("#flashcard-display").hide(); })

        $("#download-flashcards").on("click", () => {
            let text = dataManager.getTxtFile();

            let a = document.createElement('a');
            a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            a.setAttribute('download', 'flashcardFile.txt');
          
            a.style.display = 'none';
            document.body.appendChild(a);
          
            a.click();
          
            document.body.removeChild(a);
        });

        $("#upload-data-input").on("change", (event) => {
            fileUploaded(event);
        });
    }

    function PromptCardWrapper(cardData, speaker, dataManager) {
        this.scoreIndex = -1;

        this.promptText = cardData.is12 ? cardData.card.lang1 : cardData.card.lang2;
        this.responseText = cardData.is12 ? cardData.card.lang2 : cardData.card.lang1;

        this.speakPrompt = function () {
            let speakFunc = cardData.is12 ? speaker.speakLang1 : speaker.speakLang2;
            speakFunc(this.promptText);
        }

        this.speakResponse = function () {
            let speakFunc = cardData.is12 ? speaker.speakLang2 : speaker.speakLang1;
            speakFunc(this.responseText);
        }

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