class VideoScreenshotTool {
    constructor() {
        this.screenshots = [];
        this.currentVideo = null;
        this.subtitles = [];
        this.translatedSubtitles = [];
        this.recognition = null;
        this.isRecognizing = false;
        this.currentTab = 'original';
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.videoContainer = document.getElementById('videoContainer');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.generateSubBtn = document.getElementById('generateSubBtn');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.imageInput = document.getElementById('imageInput');
        this.notesTextarea = document.getElementById('notesTextarea');
        this.originalSubtitleTextarea = document.getElementById('originalSubtitleTextarea');
        this.translatedSubtitleTextarea = document.getElementById('translatedSubtitleTextarea');
        this.screenshotsGallery = document.getElementById('screenshotsGallery');
        this.exportBtn = document.getElementById('exportBtn');
        this.exportSubBtn = document.getElementById('exportSubBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.sourceLanguageSelect = document.getElementById('sourceLanguageSelect');
        this.targetLanguageSelect = document.getElementById('targetLanguageSelect');
        this.startSubBtn = document.getElementById('startSubBtn');
        this.stopSubBtn = document.getElementById('stopSubBtn');
        this.translateBtn = document.getElementById('translateBtn');
        this.subtitleProgress = document.getElementById('subtitleProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.tabBtns = document.querySelectorAll('.tab-btn');
    }

    setupEventListeners() {
        // Drag and drop events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropZone.addEventListener('click', () => this.fileInput.click());

        // File input change
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Video events
        this.videoPlayer.addEventListener('timeupdate', this.updateCurrentTime.bind(this));
        this.videoPlayer.addEventListener('loadedmetadata', this.onVideoLoaded.bind(this));

        // Button events
        this.screenshotBtn.addEventListener('click', this.takeScreenshot.bind(this));
        this.generateSubBtn.addEventListener('click', this.generateSubtitles.bind(this));
        this.exportBtn.addEventListener('click', this.exportNotes.bind(this));
        this.exportSubBtn.addEventListener('click', this.exportSubtitles.bind(this));
        this.clearBtn.addEventListener('click', this.clearAll.bind(this));
        this.startSubBtn.addEventListener('click', this.startSpeechRecognition.bind(this));
        this.stopSubBtn.addEventListener('click', this.stopSpeechRecognition.bind(this));
        this.translateBtn.addEventListener('click', this.translateSubtitles.bind(this));

        // Tab switching
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', this.switchTab.bind(this));
        });

        // Notes auto-save
        this.notesTextarea.addEventListener('input', this.autoSaveNotes.bind(this));
        this.originalSubtitleTextarea.addEventListener('input', this.autoSaveSubtitles.bind(this));
        this.translatedSubtitleTextarea.addEventListener('input', this.autoSaveTranslatedSubtitles.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        const videoFile = files.find(file => file.type.startsWith('video/'));
        
        if (videoFile) {
            this.loadVideo(videoFile);
        } else {
            alert('請選擇有效的影片檔案');
        }
    }

    loadVideo(file) {
        this.currentVideo = file;
        this.imageInput.value = file.name;
        
        const videoURL = URL.createObjectURL(file);
        this.videoPlayer.src = videoURL;
        
        this.dropZone.style.display = 'none';
        this.videoContainer.style.display = 'block';
        
        // Clean up previous URL when video loads
        this.videoPlayer.addEventListener('loadstart', () => {
            if (this.videoPlayer.previousSrc) {
                URL.revokeObjectURL(this.videoPlayer.previousSrc);
            }
            this.videoPlayer.previousSrc = videoURL;
        });
    }

    onVideoLoaded() {
        console.log('影片已載入:', this.videoPlayer.duration);
    }

    updateCurrentTime() {
        const currentTime = this.videoPlayer.currentTime;
        this.currentTimeSpan.textContent = this.formatTime(currentTime);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    takeScreenshot() {
        if (!this.videoPlayer.src) {
            alert('請先載入影片');
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.videoPlayer.videoWidth;
        canvas.height = this.videoPlayer.videoHeight;
        
        ctx.drawImage(this.videoPlayer, 0, 0, canvas.width, canvas.height);
        
        const dataURL = canvas.toDataURL('image/png');
        const currentTime = this.videoPlayer.currentTime;
        const timestamp = this.formatTime(currentTime);
        
        const screenshot = {
            id: Date.now(),
            dataURL: dataURL,
            timestamp: timestamp,
            time: currentTime
        };
        
        this.screenshots.push(screenshot);
        this.addScreenshotToGallery(screenshot);
        this.insertTimestampToNotes(timestamp);
    }

    addScreenshotToGallery(screenshot) {
        const item = document.createElement('div');
        item.className = 'screenshot-item';
        item.innerHTML = `
            <img src="${screenshot.dataURL}" alt="截圖 ${screenshot.timestamp}">
            <div class="screenshot-info">${screenshot.timestamp}</div>
        `;
        
        item.addEventListener('click', () => {
            this.videoPlayer.currentTime = screenshot.time;
        });
        
        this.screenshotsGallery.appendChild(item);
    }

    insertTimestampToNotes(timestamp) {
        const currentText = this.notesTextarea.value;
        const newText = currentText + `\n\n**[${timestamp}]** `;
        this.notesTextarea.value = newText;
        this.notesTextarea.focus();
        
        // Move cursor to end
        this.notesTextarea.setSelectionRange(newText.length, newText.length);
    }

    autoSaveNotes() {
        // Auto-save to localStorage
        localStorage.setItem('videoNotes', this.notesTextarea.value);
    }

    autoSaveSubtitles() {
        // Auto-save subtitles to localStorage
        localStorage.setItem('videoSubtitles', this.originalSubtitleTextarea.value);
    }

    autoSaveTranslatedSubtitles() {
        // Auto-save translated subtitles to localStorage
        localStorage.setItem('translatedSubtitles', this.translatedSubtitleTextarea.value);
    }

    switchTab(event) {
        const targetTab = event.target.dataset.tab;
        
        // Update tab buttons
        this.tabBtns.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update textarea visibility
        this.originalSubtitleTextarea.classList.toggle('active', targetTab === 'original');
        this.translatedSubtitleTextarea.classList.toggle('active', targetTab === 'translated');
        
        this.currentTab = targetTab;
    }

    initializeSpeechRecognition() {
        // 檢查是否支援語音識別 API
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('瀏覽器不支援語音識別功能');
            this.startSubBtn.disabled = true;
            this.startSubBtn.innerHTML = '❌ 不支援語音識別';
            this.showAlternativeMethod();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.sourceLanguageSelect.value;
        
        this.recognition.onstart = () => {
            this.isRecognizing = true;
            this.subtitleProgress.style.display = 'block';
            this.startSubBtn.style.display = 'none';
            this.stopSubBtn.style.display = 'inline-block';
            this.progressText.textContent = '正在識別語音...';
            this.animateProgress();
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                const currentTime = this.videoPlayer.currentTime;
                const timestamp = this.formatTime(currentTime);
                const subtitleEntry = `[${timestamp}] ${finalTranscript.trim()}\n`;
                
                this.originalSubtitleTextarea.value += subtitleEntry;
                this.subtitles.push({
                    time: currentTime,
                    text: finalTranscript.trim(),
                    timestamp: timestamp
                });
                
                this.autoSaveSubtitles();
            }
        };

        this.recognition.onerror = (event) => {
            console.error('語音識別錯誤:', event.error);
            this.stopSpeechRecognition();
            
            if (event.error === 'not-allowed') {
                alert('麥克風權限被拒絕。請嘗試以下解決方案：\n\n1. 點擊網址列的麥克風圖示並允許權限\n2. 重新整理頁面\n3. 使用手動輸入字幕功能');
                this.showAlternativeMethod();
            } else {
                alert(`語音識別錯誤: ${event.error}`);
            }
        };

        this.recognition.onend = () => {
            if (this.isRecognizing) {
                // 如果還在識別中，重新啟動
                this.recognition.start();
            }
        };
    }

    startSpeechRecognition() {
        if (!this.videoPlayer.src) {
            alert('請先載入影片');
            return;
        }

        if (!this.recognition) {
            alert('語音識別功能不可用');
            return;
        }

        this.recognition.lang = this.sourceLanguageSelect.value;
        this.recognition.start();
        this.videoPlayer.play();
    }

    stopSpeechRecognition() {
        this.isRecognizing = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        
        this.subtitleProgress.style.display = 'none';
        this.startSubBtn.style.display = 'inline-block';
        this.stopSubBtn.style.display = 'none';
    }

    animateProgress() {
        if (!this.isRecognizing) return;
        
        const duration = this.videoPlayer.duration || 1;
        const currentTime = this.videoPlayer.currentTime || 0;
        const progress = (currentTime / duration) * 100;
        
        this.progressFill.style.width = `${progress}%`;
        
        if (this.isRecognizing) {
            requestAnimationFrame(() => this.animateProgress());
        }
    }

    generateSubtitles() {
        if (!this.videoPlayer.src) {
            alert('請先載入影片');
            return;
        }
        
        // 簡化版：直接啟動語音識別
        this.startSpeechRecognition();
    }

    exportSubtitles() {
        const originalSubtitles = this.originalSubtitleTextarea.value;
        const translatedSubtitles = this.translatedSubtitleTextarea.value;
        
        if (!originalSubtitles.trim() && !translatedSubtitles.trim()) {
            alert('沒有字幕內容可以匯出');
            return;
        }

        // 詢問用戶要匯出哪種字幕
        let subtitlesToExport = originalSubtitles;
        let suffix = 'original';
        
        if (translatedSubtitles.trim()) {
            const choice = confirm('要匯出翻譯字幕嗎？\n\n確定：匯出翻譯字幕\n取消：匯出原文字幕');
            if (choice) {
                subtitlesToExport = translatedSubtitles;
                suffix = 'translated';
            }
        }

        const videoName = this.currentVideo ? this.currentVideo.name : 'video';
        
        // 匯出 SRT 格式
        let srtContent = '';
        const lines = subtitlesToExport.split('\n').filter(line => line.trim());
        
        lines.forEach((line, index) => {
            const match = line.match(/\[([^\]]+)\]\s*(.+)/);
            if (match) {
                const timestamp = match[1];
                const text = match[2];
                
                // 計算結束時間（假設每段字幕持續3秒）
                const startTime = this.parseTimestamp(timestamp);
                const endTime = this.formatSRTTime(startTime + 3);
                const startTimeSRT = this.formatSRTTime(startTime);
                
                srtContent += `${index + 1}\n`;
                srtContent += `${startTimeSRT} --> ${endTime}\n`;
                srtContent += `${text}\n\n`;
            }
        });
        
        this.downloadFile(srtContent, `${videoName.replace(/\.[^/.]+$/, '')}_subtitles_${suffix}.srt`);
    }

    parseTimestamp(timestamp) {
        const parts = timestamp.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    }

    formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    }

    showAlternativeMethod() {
        this.originalSubtitleTextarea.placeholder = '語音識別不可用。請手動輸入字幕，格式：\n[00:00:05] 這裡是字幕內容\n[00:00:10] 下一段字幕內容...';
    }

    async translateSubtitles() {
        const originalText = this.originalSubtitleTextarea.value;
        if (!originalText.trim()) {
            alert('請先輸入或產生原文字幕');
            return;
        }

        const sourceLanguage = this.sourceLanguageSelect.value;
        const targetLanguage = this.targetLanguageSelect.value;

        if (sourceLanguage === targetLanguage) {
            alert('來源語言和目標語言不能相同');
            return;
        }

        this.translateBtn.disabled = true;
        this.translateBtn.innerHTML = '🔄 翻譯中...';

        try {
            const translatedText = await this.translateText(originalText, sourceLanguage, targetLanguage);
            this.translatedSubtitleTextarea.value = translatedText;
            this.autoSaveTranslatedSubtitles();
            
            // 自動切換到翻譯標籤
            const translatedTab = document.querySelector('[data-tab="translated"]');
            if (translatedTab) {
                translatedTab.click();
            }
            
        } catch (error) {
            console.error('翻譯錯誤:', error);
            alert('翻譯失敗，請檢查網路連線或稍後再試');
        } finally {
            this.translateBtn.disabled = false;
            this.translateBtn.innerHTML = '🌐 翻譯現有字幕';
        }
    }

    async translateText(text, sourceLang, targetLang) {
        // 使用免費的翻譯服務 (MyMemory Translation API)
        const lines = text.split('\n').filter(line => line.trim());
        const translatedLines = [];

        for (const line of lines) {
            const match = line.match(/\[([^\]]+)\]\s*(.+)/);
            if (match) {
                const timestamp = match[1];
                const content = match[2];
                
                try {
                    const translatedContent = await this.translateSingleText(content, sourceLang, targetLang);
                    translatedLines.push(`[${timestamp}] ${translatedContent}`);
                } catch (error) {
                    console.warn('翻譯單行失敗:', error);
                    translatedLines.push(line); // 保留原文
                }
                
                // 添加延遲避免 API 限制
                await this.delay(100);
            } else {
                translatedLines.push(line);
            }
        }

        return translatedLines.join('\n');
    }

    async translateSingleText(text, sourceLang, targetLang) {
        const langMap = {
            'en-US': 'en',
            'zh-TW': 'zh',
            'zh-CN': 'zh-cn',
            'ja-JP': 'ja'
        };

        const fromLang = langMap[sourceLang] || 'en';
        const toLang = langMap[targetLang] || 'zh';

        // 使用 MyMemory Translation API (免費但有限制)
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.responseStatus === 200) {
            return data.responseData.translatedText;
        } else {
            throw new Error('Translation failed');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    exportNotes() {
        const notes = this.notesTextarea.value;
        const videoName = this.currentVideo ? this.currentVideo.name : 'video';
        
        let content = `# ${videoName} - 影片筆記\n\n`;
        content += `匯出時間: ${new Date().toLocaleString('zh-TW')}\n\n`;
        content += `## 筆記內容\n\n${notes}\n\n`;
        
        if (this.screenshots.length > 0) {
            content += `## 截圖時間戳記\n\n`;
            this.screenshots.forEach(screenshot => {
                content += `- ${screenshot.timestamp}\n`;
            });
        }
        
        this.downloadFile(content, `${videoName.replace(/\.[^/.]+$/, '')}_notes.md`);
    }

    downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearAll() {
        if (confirm('確定要清除所有內容嗎？')) {
            this.stopSpeechRecognition();
            this.screenshots = [];
            this.subtitles = [];
            this.translatedSubtitles = [];
            this.notesTextarea.value = '';
            this.originalSubtitleTextarea.value = '';
            this.translatedSubtitleTextarea.value = '';
            this.screenshotsGallery.innerHTML = '';
            this.imageInput.value = '';
            
            if (this.videoPlayer.src) {
                URL.revokeObjectURL(this.videoPlayer.src);
                this.videoPlayer.src = '';
            }
            
            this.videoContainer.style.display = 'none';
            this.dropZone.style.display = 'flex';
            
            localStorage.removeItem('videoNotes');
            localStorage.removeItem('videoSubtitles');
            localStorage.removeItem('translatedSubtitles');
        }
    }

    // Load saved notes on initialization
    loadSavedNotes() {
        const savedNotes = localStorage.getItem('videoNotes');
        if (savedNotes) {
            this.notesTextarea.value = savedNotes;
        }
        
        const savedSubtitles = localStorage.getItem('videoSubtitles');
        if (savedSubtitles) {
            this.originalSubtitleTextarea.value = savedSubtitles;
        }
        
        const savedTranslatedSubtitles = localStorage.getItem('translatedSubtitles');
        if (savedTranslatedSubtitles) {
            this.translatedSubtitleTextarea.value = savedTranslatedSubtitles;
        }
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S for screenshot
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const tool = window.videoTool;
        if (tool) {
            tool.takeScreenshot();
        }
    }
    
    // Space for play/pause (when not in textarea)
    if (e.code === 'Space' && e.target !== document.getElementById('notesTextarea')) {
        e.preventDefault();
        const video = document.getElementById('videoPlayer');
        if (video.src) {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    }
});

// Initialize the tool when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.videoTool = new VideoScreenshotTool();
    window.videoTool.loadSavedNotes();
});

// Clean up URLs when page unloads
window.addEventListener('beforeunload', () => {
    const video = document.getElementById('videoPlayer');
    if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
    }
});