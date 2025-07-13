class VideoScreenshotTool {
    constructor() {
        this.results = [];
        this.currentVideo = null;
        this.isProcessing = false;
        this.fullVideoSubtitles = null;
        this.recognition = null;
        this.isRecognizing = false;
        this.audioChunks = [];
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.videoContainer = document.getElementById('videoContainer');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.imageInput = document.getElementById('imageInput');
        this.startProcessingBtn = document.getElementById('startProcessingBtn');
        this.processingProgress = document.getElementById('processingProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.subtitleMethodSelect = document.getElementById('subtitleMethodSelect');
        this.manualSubtitleInput = document.getElementById('manualSubtitleInput');
        this.manualSubtitles = document.getElementById('manualSubtitles');
        this.permissionNotice = document.getElementById('permissionNotice');
        this.intervalInput = document.getElementById('intervalInput');
        this.sizeSelect = document.getElementById('sizeSelect');
        this.mainContainer = document.querySelector('.container');
        this.resultsPage = document.getElementById('resultsPage');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.backToMainBtn = document.getElementById('backToMainBtn');
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

        // Settings events
        this.subtitleMethodSelect.addEventListener('change', this.updateSubtitleMethod.bind(this));

        // Button events
        this.startProcessingBtn.addEventListener('click', this.startProcessing.bind(this));
        this.backToMainBtn.addEventListener('click', this.backToMain.bind(this));
    }

    updateSubtitleMethod() {
        const method = this.subtitleMethodSelect.value;
        
        if (method === 'manual') {
            this.manualSubtitleInput.style.display = 'block';
            this.permissionNotice.style.display = 'none';
        } else {
            this.manualSubtitleInput.style.display = 'none';
            this.permissionNotice.style.display = 'block';
        }
    }

    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('瀏覽器不支援語音識別功能');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-TW'; // 預設繁體中文
        
        this.recognition.onstart = () => {
            this.isRecognizing = true;
            console.log('語音識別開始');
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }

            if (finalTranscript.trim()) {
                const currentTime = this.videoPlayer.currentTime;
                this.audioChunks.push({
                    text: finalTranscript.trim(),
                    time: currentTime,
                    timestamp: this.formatTime(currentTime)
                });
            }
        };

        this.recognition.onerror = (event) => {
            console.error('語音識別錯誤:', event.error);
            if (event.error === 'not-allowed') {
                alert('麥克風權限被拒絕。請重新整理頁面並允許麥克風權限。');
            }
        };

        this.recognition.onend = () => {
            if (this.isRecognizing && this.videoPlayer && !this.videoPlayer.ended) {
                // 如果影片還在播放且需要繼續識別，重新啟動
                setTimeout(() => {
                    if (this.isRecognizing) {
                        this.recognition.start();
                    }
                }, 100);
            }
        };
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

    async startProcessing() {
        if (!this.videoPlayer.src) {
            alert('請先載入影片');
            return;
        }

        if (this.isProcessing) {
            return;
        }

        const method = this.subtitleMethodSelect.value;

        this.isProcessing = true;
        this.startProcessingBtn.disabled = true;
        this.startProcessingBtn.textContent = '🔄 處理中...';
        this.processingProgress.style.display = 'block';
        this.results = [];
        this.audioChunks = [];

        try {
            if (method === 'webspeech') {
                await this.processWithWebSpeech();
            } else {
                await this.processWithManualSubtitles();
            }

            // 完成，跳轉到結果頁面
            this.progressFill.style.width = '100%';
            this.progressText.textContent = '處理完成！正在跳轉...';
            
            setTimeout(() => {
                this.showResults();
            }, 1000);

        } catch (error) {
            console.error('處理錯誤:', error);
            alert('處理失敗：' + error.message);
        } finally {
            this.isProcessing = false;
            this.isRecognizing = false;
            if (this.recognition) {
                this.recognition.stop();
            }
            this.startProcessingBtn.disabled = false;
            this.startProcessingBtn.textContent = '🗨 開始處理';
            this.processingProgress.style.display = 'none';
        }
    }

    async processWithWebSpeech() {
        if (!this.recognition) {
            throw new Error('瀏覽器不支援語音識別功能');
        }

        // 步驟1: 播放影片並同時進行語音識別
        this.progressText.textContent = '正在播放影片並識別語音...';
        this.progressFill.style.width = '20%';
        
        await this.startVideoRecognition();
        
        // 步驟2: 按間隔截圖並對應字幕
        this.progressText.textContent = '正在進行截圖處理...';
        this.progressFill.style.width = '50%';
        
        await this.processScreenshots();
        
        // 步驟3: 翻譯字幕
        this.progressText.textContent = '正在翻譯字幕...';
        this.progressFill.style.width = '80%';
        
        await this.translateAllSubtitles();
    }

    async processWithManualSubtitles() {
        const manualText = this.manualSubtitles.value.trim();
        if (!manualText) {
            throw new Error('請輸入手動字幕內容');
        }

        // 解析手動輸入的字幕
        this.progressText.textContent = '正在解析手動字幕...';
        this.progressFill.style.width = '20%';
        
        this.parseManualSubtitles(manualText);
        
        // 按間隔截圖並對應字幕
        this.progressText.textContent = '正在進行截圖處理...';
        this.progressFill.style.width = '50%';
        
        await this.processScreenshots();
        
        // 翻譯字幕
        this.progressText.textContent = '正在翻譯字幕...';
        this.progressFill.style.width = '80%';
        
        await this.translateAllSubtitles();
    }

    parseManualSubtitles(text) {
        const lines = text.split('\n').filter(line => line.trim());
        this.audioChunks = [];
        
        lines.forEach(line => {
            // 支援格式：00:00:00 字幕內容 或 直接是字幕內容
            const timeMatch = line.match(/^(\d{2}:\d{2}:\d{2})\s+(.+)$/);
            if (timeMatch) {
                const [, timeStr, text] = timeMatch;
                const time = this.parseTimeToSeconds(timeStr);
                this.audioChunks.push({
                    text: text.trim(),
                    time: time,
                    timestamp: timeStr
                });
            } else {
                // 如果沒有時間戳記，平均分配到影片中
                const index = this.audioChunks.length;
                const duration = this.videoPlayer.duration;
                const time = (duration / lines.length) * index;
                this.audioChunks.push({
                    text: line.trim(),
                    time: time,
                    timestamp: this.formatTime(time)
                });
            }
        });
    }

    parseTimeToSeconds(timeStr) {
        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    async startVideoRecognition() {
        return new Promise((resolve, reject) => {
            this.isRecognizing = true;
            
            // 開始語音識別
            this.recognition.start();
            
            // 播放影片
            this.videoPlayer.currentTime = 0;
            this.videoPlayer.play();
            
            // 監聽影片結束
            const onEnded = () => {
                this.isRecognizing = false;
                this.recognition.stop();
                this.videoPlayer.removeEventListener('ended', onEnded);
                resolve();
            };
            
            this.videoPlayer.addEventListener('ended', onEnded);
            
            // 更新進度
            const updateProgress = () => {
                if (this.videoPlayer.duration) {
                    const progress = 20 + (this.videoPlayer.currentTime / this.videoPlayer.duration) * 30;
                    this.progressFill.style.width = `${progress}%`;
                }
                
                if (this.isRecognizing) {
                    requestAnimationFrame(updateProgress);
                }
            };
            updateProgress();
        });
    }

    async processScreenshots() {
        const interval = parseInt(this.intervalInput.value);
        const duration = this.videoPlayer.duration;
        const screenshots = Math.floor(duration / interval);

        for (let i = 0; i < screenshots; i++) {
            const time = i * interval;
            
            // 跳到指定時間
            this.videoPlayer.currentTime = time;
            await this.waitForVideoSeek();

            // 截圖
            const screenshot = this.captureScreenshot();
            
            // 獲取該時間段的字幕
            const subtitleText = this.getSubtitleForTimeRange(time, time + interval);
            
            // 創建結果項目
            const resultItem = {
                id: Date.now() + i,
                time: time,
                endTime: time + interval,
                timestamp: `${this.formatTime(time)} - ${this.formatTime(time + interval)}`,
                screenshot: screenshot,
                originalSubtitle: subtitleText,
                translatedSubtitle: null
            };

            this.results.push(resultItem);

            // 更新進度
            const baseProgress = 50;
            const segmentProgress = (30 / screenshots) * (i + 1);
            this.progressFill.style.width = `${baseProgress + segmentProgress}%`;
        }
    }

    getSubtitleForTimeRange(startTime, endTime) {
        const relevantChunks = this.audioChunks.filter(chunk => 
            chunk.time >= startTime && chunk.time < endTime
        );

        return relevantChunks.map(chunk => chunk.text).join(' ').trim();
    }

    async translateAllSubtitles() {
        for (let i = 0; i < this.results.length; i++) {
            const result = this.results[i];
            if (result.originalSubtitle) {
                result.translatedSubtitle = await this.translateText(result.originalSubtitle);
            }
            
            // 更新進度
            const baseProgress = 80;
            const segmentProgress = (20 / this.results.length) * (i + 1);
            this.progressFill.style.width = `${baseProgress + segmentProgress}%`;
            
            // 短暫延遲避免 API 限制
            await this.delay(200);
        }
    }

    async translateText(text) {
        if (!text.trim()) return '';
        
        try {
            // 使用免費翻譯 API
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=zh|en`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.responseStatus === 200) {
                return data.responseData.translatedText;
            }
        } catch (error) {
            console.warn('翻譯失敗:', error);
        }
        
        // 簡單的模擬翻譯作為備用
        return `[Translated] ${text}`;
    }

    waitForVideoSeek() {
        return new Promise(resolve => {
            const onSeeked = () => {
                this.videoPlayer.removeEventListener('seeked', onSeeked);
                resolve();
            };
            this.videoPlayer.addEventListener('seeked', onSeeked);
        });
    }

    captureScreenshot() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const sizeMap = {
            'small': 400,
            'medium': 800,
            'large': 1200
        };
        
        const targetWidth = sizeMap[this.sizeSelect.value] || 800;
        const aspectRatio = this.videoPlayer.videoWidth / this.videoPlayer.videoHeight;
        const targetHeight = targetWidth / aspectRatio;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx.drawImage(this.videoPlayer, 0, 0, targetWidth, targetHeight);
        
        return canvas.toDataURL('image/png');
    }

    showResults() {
        // 隱藏主頁面，顯示結果頁面
        this.mainContainer.style.display = 'none';
        this.resultsPage.style.display = 'block';
        
        // 清空結果容器
        this.resultsContainer.innerHTML = '';
        
        // 渲染結果
        this.results.forEach((result, index) => {
            const resultElement = this.createResultElement(result, index + 1);
            this.resultsContainer.appendChild(resultElement);
        });
    }

    createResultElement(result, index) {
        const element = document.createElement('div');
        element.className = 'result-row';
        
        element.innerHTML = `
            <div class="result-screenshot">
                <img src="${result.screenshot}" alt="Screenshot ${index}">
            </div>
            <div class="result-subtitles">
                <div class="subtitle-timestamp">${result.timestamp}</div>
                <div class="subtitle-block">
                    <div class="subtitle-label">原文字幕</div>
                    <div class="subtitle-text original">${result.originalSubtitle || '無字幕內容'}</div>
                </div>
                <div class="subtitle-block">
                    <div class="subtitle-label">翻譯字幕</div>
                    <div class="subtitle-text translated">${result.translatedSubtitle || '無翻譯內容'}</div>
                </div>
            </div>
        `;
        
        return element;
    }

    backToMain() {
        this.resultsPage.style.display = 'none';
        this.mainContainer.style.display = 'block';
        
        // 重置狀態
        this.results = [];
        this.audioChunks = [];
        this.isRecognizing = false;
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the tool when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.videoTool = new VideoScreenshotTool();
});

// Clean up URLs when page unloads
window.addEventListener('beforeunload', () => {
    const video = document.getElementById('videoPlayer');
    if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
    }
});