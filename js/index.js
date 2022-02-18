document.addEventListener('DOMContentLoaded', function (e) {
    let dataManager = createDataManager();
    let speaker;

    let currPrompt;

    function init() {
        if (!window.speechSynthesis) {
            alert("This broswer is not capable of running this application.")
            return;
        }

        speaker = createSpeaker(dataManager.getLang1(), dataManager.getLang2());

        setEventHandlers();
    }

    function nextClicked() {
        speaker.stopSpeaking();

        if (!currPrompt || !currPrompt.responseHidden()) {
            // if we're on the first prompt or the response is showing, get a new card. 
            
            let randomCard = dataManager.getRandomFlashcard();
            if(randomCard == null) { 
                displayMessageDialog("No Flashcards in the application. Please add some using the menu in the top righthand corner.")
                return;
            }
            currPrompt = new PromptCardWrapper(randomCard, speaker, dataManager);

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

        l1.val(dataManager.getLang1());
        l2.val(dataManager.getLang2());
        
        $("#settings-menu").show();
    }

    function fileUploaded(event) {
        var input = event.target;

        var reader = new FileReader();
        reader.onerror = function (event) {
            alert("Failed to read file!\n\n" + reader.error);
        };
        reader.onload = function () {
            let text = reader.result;
            let result = dataManager.parseFlashcardText(text);

            $("#settings-menu").hide();
            displayOverwriteConfirmationDialog(result)
        };
        reader.readAsText(input.files[0]);
    }

    function displayOverwriteConfirmationDialog(result) {
        clearFlashcardDisplay();

        result.cards.forEach(flashcard => {
            $("#cards-display-div").append(createFlashcardCardDisplay(flashcard));
        });

        result.errors.forEach(error => {
            $("#cards-errors-display-div").append(createParseErrorDisplay(error));
        });

        $("#overwrite-date-confirmation-header").show();
        $("#overwrite-date-confirmation-controls").show();

        $("#upload-new-data-confirm-button").unbind('click');
        $("#upload-new-data-confirm-button").on("click", () => {
            $("#flashcard-display").hide();
            dataManager.setFlashcards(result.cards);
        })

        $("#flashcard-display").show();
    }

    function displayCurrentFlashcards() {
        clearFlashcardDisplay();

        dataManager.getAllFlashcards().forEach(flashcard=> {
            let card = createFlashcardCardDisplay(flashcard);
            
            let deleteButton = $("<div />");
            deleteButton.addClass("card-delete-button") 
            deleteButton.html("<i class='fa fa-trash'>")
            deleteButton.on("click", () => {
                dataManager.deleteFlashcard(flashcard);
                card.remove();
            });
            card.prepend(deleteButton)

            $("#cards-display-div").append(card);
        });

        $("#display-current-cards-header").show();
        $("#flashcard-display").show();
    }

    function displaySubmitFlashcardsConfirmationDialog() {
        let text = $("#flashcard-text-input").val();
        if(text.trim()) {
            let result = dataManager.parseFlashcardText(text);
            clearFlashcardDisplay();
    
            result.cards.forEach(flashcard => {
                $("#cards-display-div").append(createFlashcardCardDisplay(flashcard));
            });

            result.errors.forEach(error => {
                $("#cards-errors-display-div").append(createParseErrorDisplay(error));
            });
    
            $("#add-cards-confirmation-header").show();
            $("#add-cards-confirmation-controls").show();

            $("#submit-new-flashcards-confirm-button").unbind('click');
            $("#submit-new-flashcards-confirm-button").on("click", () => {
                $("#flashcard-display").hide();
                $("#flashcard-text-input").val("");
                dataManager.addFlashcards(result.cards);
            })

            $("#flashcard-display").show();
        }
    }

    function clearFlashcardDisplay() {
        $("#add-cards-confirmation-header").hide();
        $("#overwrite-date-confirmation-header").hide();
        $("#display-current-cards-header").hide();
        $("#cards-display-div").empty();
        $("#cards-errors-display-div").empty()
        $("#add-cards-confirmation-controls").hide();
        $("#overwrite-date-confirmation-controls").hide();
    }
    
    function createFlashcardCardDisplay(flashcardData) {
        let card = $("<div />");
        card.addClass("card");

        let prompt = $("<p />");
        prompt.attr("translate", "no");
        prompt.html(flashcardData.lang1);
        card.append(prompt);

        let response = $("<p />");
        response.attr("translate", "no");
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

    function createParseErrorDisplay(error) {
        let card = $("<div />");
        card.addClass("card");
        card.addClass("pink-background")

        let errorMessage = $("<p />");
        errorMessage.html(error[1]);
        card.append(errorMessage);

        let lines = $("<p />");
        lines.attr("translate", "no");
        lines.attr("style","font-family: monospace")
        lines.html(error[0].replace("/n", "<br>"));
        card.append(lines);

        return card;
    }

    function displayMessageDialog(msg) {
        $(".dialog").hide();
        $("#message-div").html(msg);
        $("#message").show();
    }

    function setEventHandlers() {
        $(".dialog").click(function (e) {
            if (e.target == this) {
                // only if the target itself has been clicked
                $(this).hide();
            }
        });

        $(".dialog-close").click((e) => {
            // if a dialog close gets clicked, close all dialogs. 
            $(".dialog").hide();
        });

        $(".message-ok").click((e) => { $(".dialog").hide(); });

        $("#logo,#app-title").on("click", function () { 
            $(".dialog").hide();
            $("#about").show();
        });

        $("#settings-button").on("click", function () { showSettings() })

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

        $("#view-flashcards").on("click", () => {
            $("#settings-menu").hide();
            displayCurrentFlashcards();
        });

        $("#add-flashcards").on("click", () => {
            $("#settings-menu").hide();
            $("#flashcard-input").show();
        });

        $("#submit-new-flashcards").on("click", (event) => {
            $("#flashcard-input").hide();
            displaySubmitFlashcardsConfirmationDialog();
        })

        $("#submit-new-flashcards-cancel-button").on("click", () => {
            $("#flashcard-display").hide();
            $("#flashcard-input").show();
        })

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

        $("#upload-new-data-cancel-button").on("click", () => {
            $("#flashcard-display").hide();
            $("#settings-menu").show();
        })

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
            prompt.attr("translate", "no");
            prompt.addClass('card-prompt');
            prompt.html(promptText);
            prompt.css('opacity', '0');
            card.append(prompt);

            let response = $("<p />");
            response.attr("translate", "no");
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