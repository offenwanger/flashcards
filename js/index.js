document.addEventListener('DOMContentLoaded', function (e) {
    let dataManager = createDataManager();
    let speaker;

    const NEW_CARD = 0;
    const PROMPT = 1;
    const RESPONSE = 2;

    let isPlaying = false;
    let currCardData;
    let currCard;
    let nextAction = NEW_CARD

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
        if(!isPlaying) {
            return;
        }

        if(nextAction == NEW_CARD) {
            // get a new card
            currCardData = dataManager.getRandomFlashCard();
            currCard = createCard(currCardData);
    
            $("#cards-div").append(currCard);
            
            if($("#cards-div").children().length > 10) {
                $("#cards-div").children().first().remove();
            }

            nextAction = PROMPT;

            next()
        } else if(nextAction == PROMPT) {
            let promptText = currCardData.is12? currCardData.card.lang1 : currCardData.card.lang2;
            let speakPrompt = currCardData.is12? speaker.speakLang1 : speaker.speakLang2;
            let waitPrompt = currCardData.is12? speaker.waitForSpeechLengthLang1 : speaker.waitForSpeechLengthLang2;

            let responseText = currCardData.is12? currCardData.card.lang2 : currCardData.card.lang1;
            let waitResponse = currCardData.is12? speaker.waitForSpeechLengthLang2 : speaker.waitForSpeechLengthLang1;

            // speak the prompt
            speakPrompt(promptText)
                // allow the user time to repeat the prompt
                .then(() => { return waitPrompt(promptText); })
                // show the prompt
                .then(() => { showPrompt(currCard); })
                // allow the user time to speak the response
                .then(() => { return waitResponse(responseText); })
                // continue
                .then(() => next());      
 
            nextAction = RESPONSE;
        } else if(nextAction == RESPONSE) {
            let speakResponse = currCardData.is12? speaker.speakLang2 : speaker.speakLang1;
            let responseText = currCardData.is12? currCardData.card.lang2 : currCardData.card.lang1;

            // speak the response
            speakResponse(responseText)
                // show the response
                .then(() => { showResponse(currCard); })
                // wait three seconds
                .then(() => {return new Promise(resolve => setTimeout(() => resolve(), 3000));})
                // continue
                .then(() => next());

            nextAction = NEW_CARD;
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

        if(dataManager.isInitialized()) {
            l1.val(dataManager.getLang1());
            l2.val(dataManager.getLang2());
        }

        $("#settings-menu").show();
    }

    function closeSettings() {
        $("#settings-menu").hide();
    }

    function createCard(cardData) {
        let card = $("<div />");
        card.addClass("card");

        let prompt = $("<p />");
        prompt.addClass('card-prompt');
        prompt.html(cardData.is12?cardData.card.lang1:cardData.card.lang2);
        prompt.css('opacity', '0');
        card.append(prompt);

        let response = $("<p />");
        response.addClass('card-response');
        response.html(cardData.is12?cardData.card.lang2:cardData.card.lang1);
        response.css('opacity', '0');
        card.append(response);

        let scoresDiv = $("<div />");
        card.append(scoresDiv);

        let scores = [
            SCORE_GREAT_INDICATOR, 
            SCORE_GOOD_INDICATOR, 
            SCORE_AVERAGE_INDICATOR, 
            SCORE_BAD_INDICATOR, 
            SCORE_TERRIBLE_INDICATOR
        ]

        for(let i = 0;i<scores.length;i++) {
            let div = $("<div />");
            div.attr("score_index", i);
            div.addClass('button-div' );
            div.addClass('feedback-button');
            div.html(scores[i])
            div.on('click', () => { scoreOnClick(cardData.card.id, i, cardData.is12, div, scoresDiv) });
            scoresDiv.append(div);
        }

        return card;
    }

    function showPrompt(card) {
        let prompt = card.find( ".card-prompt" ).first();
        prompt.fadeTo(0.5, 1)
    }

    function showResponse(card) {
        let response = card.find( ".card-response" ).first();
        response.fadeTo(0.5, 1)
    }

    function setEventHandlers() {
        $("#settings-button").on("click", function(){ showSettings() })
        $("#close-settings-menu-button").on("click", function(){ closeSettings(); })
        
        $("#lang1-select").on("change", () => {
            speaker.setLang1($("#lang1-select").val())
            dataManager.setLang1($("#lang1-select").val())
        });
    
        $("#lang2-select").on("change", (ev) => {
            speaker.setLang2($("#lang2-select").val())
            dataManager.setLang2($("#lang2-select").val())
        });
    
        $("#play-pause-button").on("click", () => {
            if(isPlaying) {
                isPlaying = false;
                $("#play-pause-button-pause").hide();
                $("#play-pause-button-play").show();
            } else {
                isPlaying = true;
                $("#play-pause-button-play").hide();
                $("#play-pause-button-pause").show();
                next();
            }
        });
        
        $("#play-pause-button-pause").hide();
    }

    function scoreOnClick(cardId, scoreIndex, is12, div, scoresDiv) {
        let currentScoreDiv = scoresDiv.find( ".selected" );
        if(currentScoreDiv.length > 0) {
            currentScoreDiv = currentScoreDiv.first();
            let oldScoreIndex = parseInt(currentScoreDiv.attr("score_index"));
            currentScoreDiv.removeClass('selected');
            dataManager.decrementScore(cardId, oldScoreIndex, is12);
        }

        div.addClass("selected");
        dataManager.incrementScore(cardId, scoreIndex, is12);
    }


    init()
});