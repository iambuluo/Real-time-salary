document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const settingsPanel = document.getElementById('settings-panel');
    const displayPanel = document.getElementById('display-panel');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const earningsDisplay = document.getElementById('earnings');
    const currencySymbol = document.getElementById('currency-symbol');
    const monthlySalaryInput = document.getElementById('monthly-salary');
    const workDaysInput = document.getElementById('work-days');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const canvas = document.getElementById('coin-canvas');
    const ctx = canvas.getContext('2d');
    const rewardModal = document.getElementById('reward-modal');
    const rewardImage = document.getElementById('reward-image');
    const rewardText = document.getElementById('reward-text');
    const langCnBtn = document.getElementById('lang-cn');
    const langEnBtn = document.getElementById('lang-en');

    // --- State Variables ---
    let salaryPerSecond = 0;
    let earnings = 0;
    let intervalId = null;
    let lastFloorEarnings = 0;
    let currentLang = 'zh-CN';
    let nextRewardIndex = 0;
    let isAnimating = false;

    // --- Setup ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- Translations and Rewards Data ---
    const translations = {
        'zh-CN': {
            title: '实时工资',
            settings_header: '我的工资计算器',
            monthly_salary_label: '月薪 (元):',
            monthly_salary_placeholder: '例如: 10000',
            work_days_label: '每月工作天数:',
            work_days_placeholder: '例如: 22',
            start_time_label: '上班时间:',
            end_time_label: '下班时间:',
            start_button: '开始计算',
            start_button_loading: '准备中...',
            display_header: '我正在赚取...',
            motivation_quote: '坚持住，每一秒都有价值！',
            reset_button: '重新设置',
            alert_invalid_input: '请输入有效的月薪和工作天数！',
            alert_invalid_time: '下班时间必须晚于上班时间！',
            currency_symbol: '¥',
            reward_prefix: '恭喜！您已赚到一份',
            reward_suffix: '！'
        },
        'en-US': {
            title: 'Real-Time Salary',
            settings_header: 'My Salary Calculator',
            monthly_salary_label: 'Monthly Salary ($):',
            monthly_salary_placeholder: 'e.g., 5000',
            work_days_label: 'Work Days per Month:',
            work_days_placeholder: 'e.g., 22',
            start_time_label: 'Work Start Time:',
            end_time_label: 'Work End Time:',
            start_button: 'Start Calculating',
            start_button_loading: 'Preparing...',
            display_header: 'I am earning...',
            motivation_quote: 'Keep going, every second counts!',
            reset_button: 'Reset',
            alert_invalid_input: 'Please enter a valid salary and work days!',
            alert_invalid_time: 'End time must be after start time!',
            currency_symbol: '$',
            reward_prefix: "Congrats! You've earned enough for ",
            reward_suffix: '!'
        }
    };

    const rewards = {
        'zh-CN': [
            { threshold: 10, name: '豪华早餐', image: 'https://i.imgur.com/v5B8b6m.png' },
            { threshold: 25, name: '星巴克咖啡', image: 'https://i.imgur.com/N1a4Bst.png' },
            { threshold: 50, name: '丰盛午餐', image: 'https://i.imgur.com/3Yp4J1a.png' },
            { threshold: 100, name: '双人电影票', image: 'https://i.imgur.com/sS2t7vI.png' }
        ],
        'en-US': [
            { threshold: 5, name: 'a Large Coffee', image: 'https://i.imgur.com/N1a4Bst.png' },
            { threshold: 15, name: 'a great Lunch', image: 'https://i.imgur.com/3Yp4J1a.png' },
            { threshold: 30, name: 'a new Book', image: 'https://i.imgur.com/dAmYk7d.png' },
            { threshold: 50, name: 'a new Video Game', image: 'https://i.imgur.com/yATa2a5.png' }
        ]
    };

    // --- Coin Animation ---
    let coins = [];
    // 金币音效
    const coinAudio = new Audio('https://cdn.pixabay.com/audio/2022/07/26/audio_124bfae7c7.mp3');
    coinAudio.volume = 0.5;
    // 金币动画升级
    function drawCoinSVG(ctx, x, y, r, alpha, rotate, currency) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(rotate);
        // 金色渐变
        let grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
        grad.addColorStop(0, '#fffbe6');
        grad.addColorStop(0.5, '#FFD700');
        grad.addColorStop(1, '#b8860b');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.fill();
        // 边缘高光
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur = 0;
        ctx.fill();
        // 金币符号
        ctx.font = `${r * 1.2}px Arial Black,Arial,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fffbe6';
        ctx.shadowColor = '#b8860b';
        ctx.shadowBlur = 10;
        ctx.fillText(currency, 0, 2);
        ctx.restore();
    }

    function Coin(x, y, vx, vy, isBig, currency) {
        this.x = x;
        this.y = y;
        this.vx = vx * 0.5; // 更慢
        this.vy = vy * 0.25; // 更慢
        this.radius = isBig ? (Math.random() * 18 + 32) : (Math.random() * 10 + 18);
        this.alpha = 1;
        this.rotate = Math.random() * Math.PI * 2;
        this.rotateSpeed = (Math.random() - 0.5) * 0.08;
        this.currency = currency;
    }

    function createCoinFall(isBig) {
        const coinCount = isBig ? 40 : 8;
        const currency = currencySymbol.textContent || '¥';
        for (let i = 0; i < coinCount; i++) {
            const x = Math.random() * canvas.width;
            const y = -Math.random() * canvas.height * 0.5;
            const vx = Math.random() * 4 - 2;
            const vy = Math.random() * 2 + 1;
            coins.push(new Coin(x, y, vx, vy, isBig, currency));
        }
        if (!isAnimating) {
            animateCoins();
        }
        // 播放金币音效
        try {
            coinAudio.currentTime = 0;
            coinAudio.play();
        } catch (e) {}
        console.log('金币动画触发', coins.length);
    }

    function animateCoins() {
        if (coins.length === 0) {
            isAnimating = false;
            return;
        }
        isAnimating = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        coins.forEach((coin, index) => {
            // 更慢的重力和旋转
            coin.vy += 0.04;
            coin.x += coin.vx;
            coin.y += coin.vy;
            coin.rotate += coin.rotateSpeed;
            coin.alpha -= 0.0012;
            if (coin.alpha > 0) {
                drawCoinSVG(ctx, coin.x, coin.y, coin.radius, coin.alpha, coin.rotate, coin.currency);
            } else {
                coins.splice(index, 1);
            }
        });
        requestAnimationFrame(animateCoins);
    }

    // --- Language and UI ---
    function setLanguage(lang) {
        currentLang = lang;
        document.documentElement.lang = lang.slice(0, 2);
        
        const t = translations[lang];
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            if (t[key]) {
                if(el.tagName === 'INPUT') {
                    const placeholderKey = el.id.replace(/-/g, '_') + '_placeholder';
                     el.placeholder = t[placeholderKey] || '';
                } else {
                    el.textContent = t[key];
                }
            }
        });
        // Special cases
        document.title = t.title;
        monthlySalaryInput.placeholder = t.monthly_salary_placeholder;
        workDaysInput.placeholder = t.work_days_placeholder;
        currencySymbol.textContent = t.currency_symbol;
        if (!startBtn.disabled) {
           startBtn.textContent = t.start_button;
        }

        // Update button active state
        langCnBtn.classList.toggle('active', lang === 'zh-CN');
        langEnBtn.classList.toggle('active', lang === 'en-US');
    }

    langCnBtn.addEventListener('click', () => setLanguage('zh-CN'));
    langEnBtn.addEventListener('click', () => setLanguage('en-US'));
    
    // --- Reward System ---
    function showReward(reward) {
        const t = translations[currentLang];
        
        // Preload image to prevent showing modal with no image
        const rewardImgEl = new Image();
        rewardImgEl.onload = () => {
            rewardImage.src = rewardImgEl.src;
            rewardText.textContent = `${t.reward_prefix}${reward.name}${t.reward_suffix}`;
            rewardModal.classList.add('visible');

            setTimeout(() => {
                rewardModal.classList.remove('visible');
            }, 5000); // Show for 5 seconds
        };
        rewardImgEl.src = reward.image;
    }

    // --- Core Logic ---
    startBtn.addEventListener('click', () => {
        const monthlySalary = parseFloat(monthlySalaryInput.value);
        const workDays = parseInt(workDaysInput.value);
        const startTime = startTimeInput.value.split(':');
        const endTime = endTimeInput.value.split(':');
        const t = translations[currentLang];

        if (isNaN(monthlySalary) || isNaN(workDays) || monthlySalary <= 0 || workDays <= 0) {
            alert(t.alert_invalid_input);
            return;
        }

        const startHour = parseInt(startTime[0]);
        const startMinute = parseInt(startTime[1]);
        const endHour = parseInt(endTime[0]);
        const endMinute = parseInt(endTime[1]);

        const totalWorkMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);
        if (totalWorkMinutes <= 0) {
            alert(t.alert_invalid_time);
            return;
        }

        const totalWorkSeconds = totalWorkMinutes * 60;
        const dailySalary = monthlySalary / workDays;
        salaryPerSecond = dailySalary / totalWorkSeconds;

        settingsPanel.classList.add('hidden');
        displayPanel.classList.remove('hidden');

        startEarning();
    });

    resetBtn.addEventListener('click', () => {
        stopEarning();
        earnings = 0;
        lastFloorEarnings = 0;
        nextRewardIndex = 0;
        earningsDisplay.textContent = '0.0000';
        displayPanel.classList.add('hidden');
        settingsPanel.classList.remove('hidden');
    });

    function startEarning() {
        if (intervalId) return;
        intervalId = setInterval(updateEarnings, 1000);
    }

    function stopEarning() {
        clearInterval(intervalId);
        intervalId = null;
    }

    function updateEarnings() {
        earnings += salaryPerSecond;
        earningsDisplay.textContent = earnings.toFixed(4);
        
        // Check for integer crossing for coin fall
        const currentFloorEarnings = Math.floor(earnings);
        if (currentFloorEarnings > lastFloorEarnings) {
            lastFloorEarnings = currentFloorEarnings;
            if (currentFloorEarnings > 0 && currentFloorEarnings % 10 === 0) {
                createCoinFall(true); // big fall
            } else {
                createCoinFall(false); // small fall
            }
        }
        
        // Check for rewards
        const currentRewards = rewards[currentLang];
        if (nextRewardIndex < currentRewards.length && earnings >= currentRewards[nextRewardIndex].threshold) {
            showReward(currentRewards[nextRewardIndex]);
            nextRewardIndex++;
        }
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // Initial language setup
    setLanguage('zh-CN');

    // --- 情绪检测弹窗逻辑 ---
    const emotionBtn = document.getElementById('emotion-btn');
    const emotionModal = document.getElementById('emotion-modal');
    const emotionVideo = document.getElementById('emotion-video');
    const emotionCanvas = document.getElementById('emotion-canvas');
    const emotionResult = document.getElementById('emotion-result');
    const emotionCapture = document.getElementById('emotion-capture');
    const emotionClose = document.getElementById('emotion-close');
    let emotionStream = null;

    emotionBtn.addEventListener('click', async () => {
        emotionModal.classList.add('visible');
        emotionResult.textContent = '';
        // 打开摄像头
        try {
            emotionStream = await navigator.mediaDevices.getUserMedia({ video: true });
            emotionVideo.srcObject = emotionStream;
        } catch (e) {
            emotionResult.textContent = '无法访问摄像头';
        }
    });

    emotionClose.addEventListener('click', () => {
        emotionModal.classList.remove('visible');
        if (emotionStream) {
            emotionStream.getTracks().forEach(track => track.stop());
            emotionStream = null;
        }
        emotionVideo.srcObject = null;
    });

    // mock表情识别
    function mockDetectEmotion() {
        const emotions = [
            { label: '高兴', emoji: '😄', en: 'happy' },
            { label: '平静', emoji: '😐', en: 'neutral' },
            { label: '沮丧', emoji: '😞', en: 'sad' },
            { label: '疲惫', emoji: '🥱', en: 'tired' }
        ];
        return emotions[Math.floor(Math.random() * emotions.length)];
    }

    emotionCapture.addEventListener('click', () => {
        // 拍照
        const ctx = emotionCanvas.getContext('2d');
        ctx.drawImage(emotionVideo, 0, 0, emotionCanvas.width, emotionCanvas.height);
        // 这里后续可接入face-api.js识别
        const detected = mockDetectEmotion();
        emotionResult.innerHTML = `<span style='font-size:2em;'>${detected.emoji}</span>  ${detected.label}`;
    });

    // 注册Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('service-worker.js');
        });
    }
}); 