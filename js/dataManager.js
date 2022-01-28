

let Flashcard = function(id, lang1txt = "", lang2txt = "", score12 = new Score(), score21 = new Score()) {
    this.id = id;
    this.lang1 = lang1txt;
    this.lang2 = lang2txt;
    this.score12 = score12;
    this.score21 = score21;
}

let Score = function(great = 0, good = 0, average = 0, bad = 0, terrible = 0) {
    this.scores = [great, good, average, bad, terrible]

    this.isZero = function() {
        return this.scores.every(score => score == 0);
    }
}


let createDataManager = function() {
    const KEY_INTIALIZED = "flash_cards_system_initialized";
    const KEY_LANG1 = "lang1Setting";
    const KEY_LANG2 = "lang2Setting";
    const PARTIAL_KEY_FLASHCARD = "flashcard"

    let flashcards = [];

    function isInitialized() {
        return localStorage.getItem(KEY_INTIALIZED) == 'true';
    }

    function initialize(fileText) {
        if(isInitialized()) throw error("Already initialized!");

        localStorage.setItem(KEY_LANG1, DEFAULT_LANG1);
        localStorage.setItem(KEY_LANG2, DEFAULT_LANG2);
        localStorage.setItem(KEY_INTIALIZED, 'true');
        setStateFromTxtFile(fileText);
    }

    function setStateFromTxtFile(fileText) {
        let data = parseTxtFile(fileText);

        flashcards.forEach(card => {
            localStorage.removeItem(PARTIAL_KEY_FLASHCARD+card.id);
        })

        data.cards.forEach(card => {
            localStorage.setItem(PARTIAL_KEY_FLASHCARD+card.id, JSON.stringify(card));
        })

        flashcards = getAllCards();
        
    }

    function getLang1() {
        return localStorage.getItem(KEY_LANG1);
    }
    
    function setLang1(langStr) {
        return localStorage.setItem(KEY_LANG1, langStr);
    }
    
    function getLang2() {
        return localStorage.getItem(KEY_LANG2);
    }
    
    function setLang2(langStr) {
        return localStorage.setItem(KEY_LANG2, langStr);
    }
    
    function getAllCards() {
        let cardKeys = [];
        for (let i = 0, len = localStorage.length; i < len; i++) {
            if(localStorage.key(i).includes(PARTIAL_KEY_FLASHCARD)) {
                cardKeys.push(localStorage.key(i))
            }
        }

        let flashcards = []
        cardKeys.forEach(cardKey => {
            flashcards.push(JSON.parse(localStorage.getItem(cardKey)));
        });
    }
    
    function incrementScore(cardId, scoreIndex, is12) {
        let card = flashcards.find(card => card.id == cardId)
        is12? card.score12[scoreIndex]++ : card.score21[scoreIndex]++;
        setCard(card);
    }

    function setCard(card) {
        localStorage.setItem(PARTIAL_KEY_FLASHCARD+card.id, JSON.stringify(card));
    }

    function getRandomFlashCard() {
        //skew this by score.

        let card = flashcards[Random.getInt(falshcards.length)];
        let is12 = Random.getBool();

        return {card, is12}
    }

    /**
     * @returns A string with the text file (with the appropriate newlines)
     */
    function getTxtFile() {
        let textStr = "" + TEXT_FILE_HEADER;
        
        flashcards.array.forEach(card => {
            textStr += LANG1_TAG +": "+card.lang1+"\n";
            textStr += LANG2_TAG +": "+card.lang2+"\n";
            textStr += SCORE_LANG1_TO_LANG2_TAG +": "+scoreToString(card.score12)+"\n";
            textStr += SCORE_LANG2_TO_LANG1_TAG +": "+scoreToString(card.score21)+"\n";
            textStr += "\n";
        });

        return textStr;
    }

    /**
     * @param {*} txtString string of text
     * @returns An oject with
     *     cards: An array of the flashcards extracted with their scores
     *     errors: an array of tupes, [line, error]
     */
    function parseTxtFile(txtString) {
        let lines = txtString.split(/\r?\n/);
        // strip excess whitespace
        lines = lines.map(line => line.trim());

        // remove empty lines
        lines=  lines.filter(line =>  line);
        // remove comments
        lines=  lines.filter(line =>  line[0] != "*");

        let cardId = 0
        let cards = []
        let errors = []

        let currCard = new Flashcard(cardId++);
        let cardLines = []

        function finalizeCurrCard() {
            if(!currCard.lang1) {
                errors.push([cardLines.join["\n"], "Error: Language 1 missing."])
            } else if(!currCard.lang2) {
                errors.push([cardLines.join["\n"], "Error: Language 2 missing."])
            } else {
                cards.push(currCard);
            }

            currCard = new Flashcard(cardId++);
            cardLines = []
        }

        for(let i = 0;i<lines.length;i++) {
            let line = lines[i];
            // split off on the first space, then strip the : if it's there. 
            let tag = line.split(" ")[0].split(":")[0];
            
            if(tag == LANG1_TAG) {
                if(currCard.lang1) finalizeCurrCard();
                currCard.lang1 = stripTag(line, tag);
                cardLines.push(line)
            } else if (tag == LANG2_TAG) {
                if(currCard.lang2) finalizeCurrCard();
                currCard.lang2 = stripTag(line, tag);
                cardLines.push(line)
            } else if (tag == SCORE_LANG1_TO_LANG2_TAG) {
                if(currCard.score12.isZero()) {
                    try {
                        currCard.score12 = parseScoreFromString(stripTag(line, tag))
                    } catch(e) {
                        errors.push([line, e])
                    }
                } else {
                    errors.push([cardLines.concat([line]).join("\n"), "Error: double "+SCORE_LANG1_TO_LANG2_TAG+"."])
                }
            } else if (tag == SCORE_LANG2_TO_LANG1_TAG) {
                if(currCard.score21.isZero()) {
                    try {
                        currCard.score21 = parseScoreFromString(stripTag(line, tag))
                    } catch(e) {
                        errors.push([line, e])
                    }
                } else {
                    errors.push([cardLines.concat([line]).join("\n"), "Error: double "+SCORE_LANG2_TO_LANG1_TAG+"."])
                }
            } else {
                errors.push([line, "Error: Tag not recognised: "+ tag])
            }
        
        }

        return {cards, errors}

    }

    //// Utility functions ////

    function stripTag(str, tag) {
        // remove the tag
        str = str.replace(tag, "").trim();
        // remove the : if it's there
        if(str[0] == ":") str = str.substring(1).trim();

        return str;
    }

    
    function scoreToString(score) {
        return score.great+SCORE_GREAT_INDICATOR + " " +
            score.good+SCORE_GOOD_INDICATOR + " " +
            score.average+SCORE_AVERAGE_INDICATOR + " " +
            score.bad+SCORE_BAD_INDICATOR + " " +
            score.terrible+SCORE_TERRIBLE_INDICATOR;
    }

    function parseScoreFromString(str) {
        let indicators = [SCORE_GREAT_INDICATOR, SCORE_GOOD_INDICATOR, SCORE_AVERAGE_INDICATOR, SCORE_BAD_INDICATOR, SCORE_TERRIBLE_INDICATOR]


        let lastIndex = 0;
        let numStrs = []
        indicators.forEach(indicator => {
            let index = str.indexOf(indicator);
            if(index == -1) throw "Error: Score missing for: "+indicator;
            if(index < lastIndex) throw "Error: Score indicator not in the right order: "+indicator;

            numStrs.push(str.substring(lastIndex, index))

            lastIndex = index + indicator.length;
        })

        let scores = []
        for(let i = 0;i<numStrs.length;i++) {
            let numStr = numStrs[i]
            if(numStr == "") throw "Error: No score for " + indicators[i];

            let score = parseInt(numStr);
            if(isNaN(score)) throw "Error: Unable to read score " + numStr + " for indicator "+indicators[i];

            scores.push(score)
        }

        return new Score(...scores);
    }

    if(isInitialized()) {
        flashcards = getAllCards();
    }

    function clearData() {
        localStorage.clear();
    }

    return {
        isInitialized,
        initialize,
        setStateFromTxtFile,
        
        getLang1,
        setLang1,
        getLang2,
        setLang2,

        getTxtFile,
        parseTxtFile,
        getRandomFlashCard,
        incrementScore,

        clearData
    }
}