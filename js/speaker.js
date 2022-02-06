let createSpeaker = function (lang1uri, lang2uri) {
    let voices = speechSynthesis.getVoices();
    let lang1, lang2;
    
    speechSynthesis.onvoiceschanged = function() {
        voices = speechSynthesis.getVoices();

        if(!lang1) setLang1(lang1uri);
        if(!lang2) setLang2(lang2uri);
    };

    function speakLang1(text) {
        if(!lang1) return Promise.reject("lang1 not initialized");
        return speak(text, lang1, true);
    }

    function speakLang2(text) {
        if(!lang2) return Promise.reject("Lang2 not initialized");
        return speak(text, lang2, true);
    }
    
    function waitForSpeechLengthLang1(text) {
        if(!lang1) return Promise.reject("lang1 not initialized");
        return speak(text, lang1, false);
    }

    function waitForSpeechLengthLang2(text) {
        if(!lang2) return Promise.reject("Lang2 not initialized");
        return speak(text, lang2, false);
    }

    function speak(text, lang, outloud) {
        return new Promise((resolve, reject) =>  {
            stopSpeaking();
            
            let utterance = new SpeechSynthesisUtterance();
            utterance.voice = lang;
            utterance.lang = utterance.voice.lang;
            utterance.text = text;
            utterance.onend = function() {resolve()};
            utterance.volume = outloud? 1:0;

            speechSynthesis.speak(utterance);
        });
    }

    function setLang1(langUri) {
        let voice = voices.find(voice => voice.voiceURI == langUri);
        if(!voice) {
            return false;
        } else {
            lang1 = voice;
            return true;
        }
    }

    function setLang2(langUri) {
        let voice = voices.find(voice => voice.voiceURI == langUri);
        if(!voice) {
            return false;
        } else {
            lang2 = voice;
            return true;
        }
    }

    function stopSpeaking() {
        speechSynthesis.cancel();
    }

    function getVoices() {
        return voices;
    }

    setLang1(lang1uri);
    setLang2(lang2uri);

    return {
        setLang1,
        setLang2,
        speakLang1,
        speakLang2,
        waitForSpeechLengthLang1,
        waitForSpeechLengthLang2,
        stopSpeaking,
        getVoices,
    }
}