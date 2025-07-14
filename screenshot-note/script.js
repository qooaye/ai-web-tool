class VideoScreenshotTool {
    constructor() {
        this.results = [];
        this.currentVideo = null;
        this.isProcessing = false;
        this.fullVideoSubtitles = null;
        this.whisperPipeline = null;
        this.isWhisperLoaded = false;
        this.audioChunks = [];
        this.initializeElements();
        this.setupEventListeners();
        this.initializeWhisper();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.videoContainer = document.getElementById('videoContainer');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.startProcessingBtn = document.getElementById('startProcessingBtn');
        this.processingProgress = document.getElementById('processingProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.permissionNotice = document.getElementById('permissionNotice');
        this.intervalInput = document.getElementById('intervalInput');
        this.mainContainer = document.querySelector('.container');
        this.resultsPage = document.getElementById('resultsPage');
        this.resultsContainer = document.getElementById('resultsContainer');

        // 重新選取影片按鈕
        this.reSelectBtn = document.getElementById('reSelectVideoBtn');
        if (this.reSelectBtn) {
            this.reSelectBtn.addEventListener('click', () => {
                this.resetAll();
                this.fileInput.value = '';
                this.dropZone.style.display = '';
                this.videoContainer.style.display = 'none';
                this.resultsPage.style.display = 'none';
                this.mainContainer.style.display = 'block';
            });
        }
        this.backToMainBtn = document.getElementById('backToMainBtn');
        this.unlockBtn = document.getElementById('unlockBtn');
        this.premiumModal = document.getElementById('premiumModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
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
        this.startProcessingBtn.addEventListener('click', this.startProcessing.bind(this));
        this.backToMainBtn.addEventListener('click', this.backToMain.bind(this));
        this.unlockBtn.addEventListener('click', this.showPremiumModal.bind(this));
        this.closeModalBtn.addEventListener('click', this.closePremiumModal.bind(this));
        this.premiumModal.addEventListener('click', this.handleModalBackdropClick.bind(this));

        // 重新選取影片檔案按鈕區塊
        this.reselectSection = document.getElementById('reselectSection');
        const reSelectBtn = document.getElementById('reSelectVideoBtn');
        if (reSelectBtn) {
            reSelectBtn.addEventListener('click', () => {
                this.resetAll();
                this.fileInput.value = '';
                this.dropZone.style.display = '';
                this.videoContainer.style.display = 'none';
                this.resultsPage.style.display = 'none';
                this.mainContainer.style.display = 'block';
                if (this.reselectSection) this.reselectSection.style.display = 'none';
            });
        }
        // 一開始隱藏重新選取影片檔案按鈕
        if (this.reselectSection) this.reselectSection.style.display = 'none';
    }


    async initializeWhisper() {
        try {
            console.log('正在載入 Whisper 模型...');
            this.updateWhisperStatus('正在載入 Whisper 模型...');
            
            // 動態載入 transformers
            const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
            
            // 載入 Whisper 模型 (使用較小的 base 模型)
            this.whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
                chunk_length_s: 30,
                stride_length_s: 5,
            });
            
            this.isWhisperLoaded = true;
            console.log('Whisper 模型載入完成');
            this.updateWhisperStatus('Whisper AI 語音識別');
            
        } catch (error) {
            console.error('Whisper 模型載入失敗:', error);
            this.updateWhisperStatus('❌ Whisper 載入失敗，將使用模擬字幕');
        }
    }
    
    updateWhisperStatus(message) {
        const statusElement = document.getElementById('whisperStatusText');
        if (statusElement) {
            statusElement.textContent = message;
        }
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
            // 顯示重新選取影片檔案按鈕
            if (this.reselectSection) this.reselectSection.style.display = '';
        } else {
            alert('請選擇有效的影片檔案');
        }
    }

    loadVideo(file) {
        this.currentVideo = file;
        
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
        this.checkVideoDuration();
    }

    checkVideoDuration() {
        const duration = this.videoPlayer.duration;
        if (duration > 30) {
            // 影片超過30秒，限制播放時長
            this.videoPlayer.setAttribute('data-original-duration', duration);
            this.showDurationLimitNotice(duration);
        }
    }

    showDurationLimitNotice(originalDuration) {
        const minutes = Math.floor(originalDuration / 60);
        const seconds = Math.floor(originalDuration % 60);
        alert(`影片長度為 ${minutes}:${seconds.toString().padStart(2, '0')}，已自動限制為30秒。\n\n如需處理完整影片，請付費解鎖！`);
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
        if (!this.videoPlayer.src || !this.currentVideo) {
            alert('請先載入影片');
            return;
        }

        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.startProcessingBtn.disabled = true;
        this.startProcessingBtn.textContent = '🔄 處理中...';
        this.processingProgress.style.display = 'block';
        this.results = [];
        this.audioChunks = [];
        
        // 處理過程中禁用重新選取按鈕
        if (this.reSelectBtn) {
            this.reSelectBtn.disabled = true;
        }

        try {
            await this.processWithWhisper();

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
            this.startProcessingBtn.disabled = false;
            this.startProcessingBtn.textContent = '🗨 開始處理';
            this.processingProgress.style.display = 'none';
            
            // 重新啟用重新選取按鈕
            if (this.reSelectBtn) {
                this.reSelectBtn.disabled = false;
            }
        }
    }

    async processWithWhisper() {
        // 步驟1: 提取音頻並使用 Whisper 識別
        this.progressText.textContent = '🤖 正在使用 Whisper AI 分析音頻...';
        this.progressFill.style.width = '20%';
        
        await this.extractAndTranscribeAudio();
        
        // 步驟2: 按間隔截圖並對應字幕
        this.progressText.textContent = '📷 正在進行截圖處理...';
        this.progressFill.style.width = '50%';
        
        await this.processScreenshots();
        
        // 步驟3: 翻譯字幕
        this.progressText.textContent = '🌍 正在翻譯字幕...';
        this.progressFill.style.width = '80%';
        
        await this.translateAllSubtitles();
    }


    async extractAndTranscribeAudio() {
        try {
            const maxDuration = Math.min(this.videoPlayer.duration, 30);
            console.log('開始使用 Whisper 分析音頻，影片長度:', maxDuration, '秒');
            
            if (!this.isWhisperLoaded || !this.whisperPipeline) {
                console.warn('Whisper 模型未載入，使用模擬字幕');
                this.generateMockSubtitles(maxDuration);
                return;
            }
            
            // 提取影片音頻
            const audioBuffer = await this.extractAudioFromVideo(maxDuration);
            
            if (!audioBuffer || audioBuffer.length === 0) {
                console.warn('無法提取音頻，使用模擬字幕');
                this.generateMockSubtitles(maxDuration);
                return;
            }
            
            // 檢查音頻是否為靜音（模擬數據）
            const averageVolume = audioBuffer.reduce((sum, sample) => sum + Math.abs(sample), 0) / audioBuffer.length;
            if (averageVolume < 0.001) {
                console.warn('檢測到靜音或模擬音頻，使用模擬字幕');
                this.generateMockSubtitles(maxDuration);
                return;
            }
            
            // 使用 Whisper 進行語音識別
            console.log('正在使用 Whisper 進行語音識別...');
            const result = await this.whisperPipeline(audioBuffer);
            
            console.log('Whisper 識別結果:', result);
            
            // 將結果轉換為我們的格式
            if (result && result.text && result.text.trim()) {
                // 將整段文字按時間分段
                this.convertWhisperResultToChunks(result.text, maxDuration);
            } else {
                console.warn('Whisper 識別無結果，使用模擬字幕');
                this.generateMockSubtitles(maxDuration);
            }
            
        } catch (error) {
            console.error('Whisper 識別錯誤:', error);
            const maxDuration = Math.min(this.videoPlayer.duration, 30);
            this.generateMockSubtitles(maxDuration);
        }
    }
    
    async extractAudioFromVideo(maxDuration) {
        try {
            console.log('開始提取真實影片音頻...');
            
            // 創建 AudioContext
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 創建 canvas 來處理影片畫面
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 設置 canvas 尺寸
            canvas.width = this.videoPlayer.videoWidth || 640;
            canvas.height = this.videoPlayer.videoHeight || 480;
            
            // 創建 MediaStreamDestination 來捕獲音頻
            const destination = audioContext.createMediaStreamDestination();
            
            // 創建音頻源
            let audioSource;
            
            // 如果影片有音軌，直接使用
            if (this.videoPlayer.mozCaptureStream) {
                // Firefox
                const stream = this.videoPlayer.mozCaptureStream();
                audioSource = audioContext.createMediaStreamSource(stream);
            } else if (this.videoPlayer.captureStream) {
                // Chrome/Edge
                const stream = this.videoPlayer.captureStream();
                audioSource = audioContext.createMediaStreamSource(stream);
            } else {
                // 替代方案：使用 Web Audio API 處理影片
                audioSource = audioContext.createMediaElementSource(this.videoPlayer);
            }
            
            // 連接音頻處理鏈
            audioSource.connect(destination);
            
            // 設置錄音參數
            const mediaRecorder = new MediaRecorder(destination.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            const audioChunks = [];
            
            // 收集音頻數據
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            // 開始錄音
            mediaRecorder.start(100); // 每100ms收集一次數據
            
            // 播放影片並錄製音頻
            this.videoPlayer.currentTime = 0;
            await this.videoPlayer.play();
            
            // 等待錄製完成
            await new Promise((resolve) => {
                setTimeout(() => {
                    mediaRecorder.stop();
                    this.videoPlayer.pause();
                    resolve();
                }, maxDuration * 1000);
            });
            
            // 等待 MediaRecorder 完成
            await new Promise((resolve) => {
                mediaRecorder.onstop = resolve;
            });
            
            // 將 Blob 數據轉換為 AudioBuffer
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // 解碼音頻數據
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // 轉換為 Whisper 需要的格式 (16kHz, 單聲道, Float32Array)
            const targetSampleRate = 16000;
            const resampledData = this.resampleAudio(audioBuffer, targetSampleRate);
            
            console.log('音頻提取完成，樣本數:', resampledData.length);
            
            // 清理資源
            audioContext.close();
            
            return resampledData;
            
        } catch (error) {
            console.error('提取音頻失敗:', error);
            console.log('降級使用模擬數據');
            
            // 降級方案：使用模擬數據
            const sampleRate = 16000;
            const samples = sampleRate * maxDuration;
            const audioData = new Float32Array(samples);
            
            for (let i = 0; i < samples; i++) {
                audioData[i] = (Math.random() - 0.5) * 0.01;
            }
            
            return audioData;
        }
    }
    
    resampleAudio(audioBuffer, targetSampleRate) {
        const originalSampleRate = audioBuffer.sampleRate;
        const originalLength = audioBuffer.length;
        const targetLength = Math.round(originalLength * targetSampleRate / originalSampleRate);
        
        // 使用第一個聲道（左聲道）
        const inputData = audioBuffer.getChannelData(0);
        const outputData = new Float32Array(targetLength);
        
        // 簡單的線性插值重採樣
        for (let i = 0; i < targetLength; i++) {
            const position = i * originalLength / targetLength;
            const index = Math.floor(position);
            const fraction = position - index;
            
            if (index + 1 < originalLength) {
                outputData[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
            } else {
                outputData[i] = inputData[index];
            }
        }
        
        return outputData;
    }
    
    convertWhisperResultToChunks(text, duration) {
        // 將 Whisper 的結果按時間分段
        this.audioChunks = [];
        const words = text.split(' ');
        const wordsPerChunk = Math.max(1, Math.floor(words.length / Math.ceil(duration / 10)));
        
        for (let i = 0; i < words.length; i += wordsPerChunk) {
            const chunkWords = words.slice(i, i + wordsPerChunk);
            const time = (i / words.length) * duration;
            
            this.audioChunks.push({
                text: chunkWords.join(' '),
                time: time,
                timestamp: this.formatTime(time)
            });
        }
        
        console.log('轉換後的音頻塊:', this.audioChunks);
    }

    async processScreenshots() {
        const interval = parseInt(this.intervalInput.value);
        const originalDuration = this.videoPlayer.duration;
        const maxDuration = Math.min(originalDuration, 30); // 限制最多30秒
        const screenshots = Math.floor(maxDuration / interval);

        for (let i = 0; i < screenshots; i++) {
            const time = i * interval;
            
            // 確保不超過30秒限制
            if (time >= maxDuration) break;
            
            // 跳到指定時間
            this.videoPlayer.currentTime = time;
            await this.waitForVideoSeek();

            // 截圖
            const screenshot = this.captureScreenshot();
            
            // 獲取該時間段的字幕
            const endTime = Math.min(time + interval, maxDuration);
            const subtitleText = this.getSubtitleForTimeRange(time, endTime);
            
            // 創建結果項目
            const resultItem = {
                id: Date.now() + i,
                time: time,
                endTime: endTime,
                timestamp: `${this.formatTime(time)} - ${this.formatTime(endTime)}`,
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

    detectLanguage(text) {
        // 簡單的語言檢測：檢查是否包含中文字符
        const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
        return chineseRegex.test(text) ? 'zh' : 'en';
    }

    async translateText(text) {
        if (!text.trim()) return '';
        
        // 檢測原文語言
        const sourceLanguage = this.detectLanguage(text);
        
        // 根據原文語言決定翻譯方向
        let langPair;
        if (sourceLanguage === 'zh') {
            langPair = 'zh|en'; // 中文翻譯成英文
            console.log('檢測到中文，翻譯成英文');
        } else {
            langPair = 'en|zh'; // 英文翻譯成中文
            console.log('檢測到英文，翻譯成中文');
        }
        
        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.responseStatus === 200) {
                console.log('翻譯結果:', data.responseData.translatedText);
                return data.responseData.translatedText;
            }
        } catch (error) {
            console.warn('翻譯失敗:', error);
        }
        
        // 簡單的模擬翻譯作為備用
        if (sourceLanguage === 'zh') {
            return `[English Translation] ${text}`;
        } else {
            return `[Chinese Translation] ${text}`;
        }
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
        
        // 固定使用400px寬度
        const targetWidth = 400;
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
        this.resetAll();
    }

    resetAll() {
        // 重置所有狀態，回到初始
        this.results = [];
        this.audioChunks = [];
        this.isProcessing = false;
        this.currentVideo = null;
        
        // 清除影片播放器
        this.videoPlayer.src = '';
        this.videoPlayer.removeAttribute('src');
        this.videoPlayer.load();
        this.currentTimeSpan.textContent = '00:00:00';
        
        // 清除進度條
        if (this.progressFill) this.progressFill.style.width = '0%';
        if (this.progressText) this.progressText.textContent = '';
        if (this.reselectSection) this.reselectSection.style.display = 'none';

        // ✅ 清除 file input 的選擇檔案
        this.fileInput.value = '';

        // ✅ 顯示拖曳區塊
        this.dropZone.style.display = '';

        // ✅ 隱藏影片播放與結果區
        this.videoContainer.style.display = 'none';
        this.resultsPage.style.display = 'none';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateMockSubtitles(duration) {
        // 生成模擬字幕，每10秒一段
        this.audioChunks = [];
        const interval = 10;
        const segments = Math.ceil(duration / interval);
        
        // 混合中英文字幕來測試翻譯功能
        const mockTexts = [
            "Welcome to this video", // 英文
            "歡迎觀看這個影片", // 中文
            "This is a Whisper AI generated subtitle", // 英文
            "這是 Whisper AI 自動生成的字幕", // 中文
            "Thank you for using our tool" // 英文
        ];
        
        for (let i = 0; i < segments; i++) {
            const time = i * interval;
            if (time >= duration) break;
            
            this.audioChunks.push({
                text: mockTexts[i % mockTexts.length],
                time: time,
                timestamp: this.formatTime(time)
            });
        }
        
        console.log('已生成模擬字幕:', this.audioChunks);
    }

    showPremiumModal() {
        this.premiumModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closePremiumModal() {
        this.premiumModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    handleModalBackdropClick(e) {
        if (e.target === this.premiumModal) {
            this.closePremiumModal();
        }
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