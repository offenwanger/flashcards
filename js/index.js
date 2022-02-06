document.addEventListener('DOMContentLoaded', function (e) {
    let dataManager = createDataManager();
    let speaker;

    if (!window.speechSynthesis) {
        alert("This broswer is not capable of running this application.")
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

    $("#speakBtn").on("click", () => {speaker.speakLang1("Here are some words").then(() => speaker.speakLang2("et voici d'autres mots"))});

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
});