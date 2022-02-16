

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
    const KEY_LANG1 = "lang1Setting";
    const KEY_LANG2 = "lang2Setting";
    const PARTIAL_KEY_FLASHCARD = "flashcard"

    let flashcards;
    let nextCardId = 0;

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

        let cards = []
        cardKeys.forEach(cardKey => {
            cards.push(JSON.parse(localStorage.getItem(cardKey)));
        });
        return cards
    }
    flashcards = getAllCards();
    nextCardId = Math.max(...flashcards.map(card => card.id), -1) + 1;

    function addFlashcards(cardArr) {
        cardArr.forEach(card => {
            flashcards.push(card);
            setCard(card);
        })
    }

    function setFlashcards(cardArr) {
        flashcards.forEach(card => {
            deleteFlashcard(card);
        })

        cardArr.forEach(card => {
            setCard(card);
        })

        flashcards = getAllCards();
    }

    function deleteFlashcard(card) {
        localStorage.removeItem(PARTIAL_KEY_FLASHCARD+card.id);
        flashcards = getAllCards();
    }
    
    function incrementScore(cardId, scoreIndex, is12) {
        if(typeof scoreIndex != 'number' || scoreIndex % 1 !== 0 || scoreIndex < 0 || scoreIndex > 4) {console.error("Bad Index! "+scoreIndex);return;}
        
        let card = flashcards.find(card => card.id == cardId)
        is12? card.score12.scores[scoreIndex]++ : card.score21.scores[scoreIndex]++;
        setCard(card);
    }

    function decrementScore(cardId, scoreIndex, is12) {
        if(typeof scoreIndex != 'number' || scoreIndex % 1 !== 0 || scoreIndex < 0 || scoreIndex > 4) {console.error("Bad Index! "+scoreIndex);return;}

        let card = flashcards.find(card => card.id == cardId)
        is12? card.score12.scores[scoreIndex]-- : card.score21.scores[scoreIndex]--;
        setCard(card);
    }

    function setCard(card) {
        localStorage.setItem(PARTIAL_KEY_FLASHCARD+card.id, JSON.stringify(card));
    }

    function getRandomFlashcard() {
        if(flashcards.length == 0) {
            return null;
        }

        let value = getRandomInt(getTotalValue());
        let sum = 0;

        for(let i = 0; i<flashcards.length;i++) {
            console.log(value, sum, getTotalValue())
            let card = flashcards[i];
            sum += getScoreValue(card.score12);
            if(value < sum) {
                let is12 = true;
                return {card, is12}
            }

            sum += getScoreValue(card.score21);
            if(value < sum) {
                let is12 = false;
                return {card, is12}
            }
        }

        console.error("Card not selected, shouled have returned by now! ")
        
        return {
            card: flashcards[getRandomInt(flashcards.length)], 
            is12: getRandomBool()
        }
    }

    function getTotalValue() {
        return flashcards.reduce((score, card) => {
            score += getScoreValue(card.score12)
            score += getScoreValue(card.score21)

            return score;
        }, 0);
    }

    function getScoreValue(score) {
        let val = 30;
        // add terrible minus great times three
        val += (score.scores[4] - score.scores[0]) * 3
        // add bad minus good
        val += score.scores[3] - score.scores[1]

        // value cannot be greater than 1 or less than 100
        val = Math.max(1, val);
        val = Math.min(100, val);

        return val;
    }

    function getAllFlashcards() {
        return [...flashcards];
    }

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    function getRandomBool() {
        return Math.random() < 0.5;
    }

    /**
     * @returns A string with the text file (with the appropriate newlines)
     */
    function getTxtFile() {
        let textStr = "" + TEXT_FILE_HEADER;
        
        flashcards.forEach(card => {
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
    function parseFlashcardText(txtString) {
        let lines = txtString.split(/\r?\n/);
        // strip excess whitespace
        lines = lines.map(line => line.trim());

        // remove empty lines
        lines=  lines.filter(line =>  line);
        // remove comments
        lines=  lines.filter(line =>  line[0] != "*");

        let cards = []
        let errors = []

        let currCard = new Flashcard(nextCardId++);
        let cardLines = []

        function finalizeCurrCard() {
            if(!currCard.lang1) {
                errors.push([cardLines.join("\n"), "Error: Language 1 missing."])
            } else if(!currCard.lang2) {
                errors.push([cardLines.join("\n"), "Error: Language 2 missing."])
            } else {
                cards.push(currCard);
            }

            currCard = new Flashcard(nextCardId++);
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

        // finalize the last card on the docket.
        finalizeCurrCard();

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
        let indicators = [SCORE_GREAT_INDICATOR, SCORE_GOOD_INDICATOR, SCORE_AVERAGE_INDICATOR, SCORE_BAD_INDICATOR, SCORE_TERRIBLE_INDICATOR]

        let str = "";
        for(let i = 0; i< indicators.length;i++) {
            str += score.scores[i] + indicators[i] + " ";
        }
        
        return str.trim();
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

    function clearData() {
        localStorage.clear();
    }

    return {        
        getLang1,
        setLang1,
        getLang2,
        setLang2,

        getTxtFile,
        parseFlashcardText,

        addFlashcards,
        setFlashcards,
        deleteFlashcard,
        getRandomFlashcard,
        getAllFlashcards,
        
        incrementScore,
        decrementScore,
        scoreToString,

        clearData
    }
}