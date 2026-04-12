// ==UserScript==
// @name         厦门理工高校邦考试AI (DeepSeek)
// @namespace    https://github.com/Wu557666/gaoxiaobangai
// @version      1.1.1
// @description  在高校邦考试/测验页面调用 DeepSeek API 自动答题，支持自定义 API 地址
// @author       Wu557666
// @match        https://xmut.class.gaoxiaobang.com/class/*/exam/*
// @match        https://xmut.class.gaoxiaobang.com/class/*/quiz/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      api.deepseek.com
// @connect      api.deepseek.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ========== 默认配置 ==========
    const DEFAULT_API_URL = 'https://api.deepseek.com/chat/completions';
    const DEFAULT_MODEL = 'deepseek-chat';

    // ========== 存储键名 ==========
    const STORAGE_API_KEY = 'deepseek_api_key';
    const STORAGE_API_URL = 'deepseek_api_url';
    const STORAGE_MODEL = 'deepseek_model';

    // ========== 获取配置 ==========
    function getApiKey() {
        return GM_getValue(STORAGE_API_KEY, '');
    }

    function setApiKey(key) {
        GM_setValue(STORAGE_API_KEY, key);
    }

    function getApiUrl() {
        return GM_getValue(STORAGE_API_URL, DEFAULT_API_URL);
    }

    function setApiUrl(url) {
        GM_setValue(STORAGE_API_URL, url);
    }

    function getModel() {
        return GM_getValue(STORAGE_MODEL, DEFAULT_MODEL);
    }

    function setModel(model) {
        GM_setValue(STORAGE_MODEL, model);
    }

    // ========== 菜单命令 ==========
    // 1. 设置 API Key
    GM_registerMenuCommand('🔑 设置 DeepSeek API Key', function() {
        const currentKey = getApiKey();
        const newKey = prompt('请输入你的 DeepSeek API Key：', currentKey || '');
        if (newKey !== null) {
            if (newKey.trim()) {
                setApiKey(newKey.trim());
                alert('✅ API Key 已保存！');
            } else {
                alert('❌ API Key 不能为空');
            }
        }
    });

    // 2. 设置 API 地址
    GM_registerMenuCommand('🌐 设置 API 地址', function() {
        const currentUrl = getApiUrl();
        const newUrl = prompt('请输入 DeepSeek API 完整地址（包含 /chat/completions）：', currentUrl);
        if (newUrl !== null) {
            if (newUrl.trim()) {
                setApiUrl(newUrl.trim());
                alert('✅ API 地址已保存！\n\n⚠️ 如果使用非官方域名，请确保脚本头部 @connect 已添加对应域名，否则请求会被阻止。');
            } else {
                setApiUrl(DEFAULT_API_URL);
                alert('✅ 已恢复为官方 API 地址');
            }
        }
    });

    // 3. 设置模型名称（可选）
    GM_registerMenuCommand('🤖 设置模型名称', function() {
        const currentModel = getModel();
        const newModel = prompt('请输入模型名称（如 deepseek-chat, deepseek-reasoner 等）：', currentModel);
        if (newModel !== null) {
            if (newModel.trim()) {
                setModel(newModel.trim());
                alert('✅ 模型已设置为：' + newModel.trim());
            } else {
                setModel(DEFAULT_MODEL);
                alert('✅ 已恢复为默认模型：' + DEFAULT_MODEL);
            }
        }
    });

    // 4. 查看当前配置
    GM_registerMenuCommand('📋 查看当前配置', function() {
        const key = getApiKey();
        const url = getApiUrl();
        const model = getModel();
        const keyPreview = key ? key.slice(0, 8) + '...' + key.slice(-4) : '未设置';
        alert(`当前配置：\n\nAPI Key: ${keyPreview}\nAPI 地址: ${url}\n模型: ${model}`);
    });

    // 5. 重置所有配置
    GM_registerMenuCommand('🔄 重置所有配置', function() {
        if (confirm('确定要清除所有配置（API Key、地址、模型）吗？')) {
            GM_deleteValue(STORAGE_API_KEY);
            GM_deleteValue(STORAGE_API_URL);
            GM_deleteValue(STORAGE_MODEL);
            alert('✅ 已重置，刷新页面后需重新设置 API Key。');
            location.reload();
        }
    });

    // ========== 初始化检查 ==========
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn('⚠️ 未设置 DeepSeek API Key，请通过脚本菜单（点击脚本管理器图标）设置。');
        const tip = document.createElement('div');
        tip.style.position = 'fixed';
        tip.style.bottom = '20px';
        tip.style.right = '20px';
        tip.style.zIndex = 9999;
        tip.style.background = '#ff9800';
        tip.style.color = 'white';
        tip.style.padding = '10px 15px';
        tip.style.borderRadius = '8px';
        tip.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        tip.innerText = '⚠️ 请先设置 API Key（点击脚本菜单）';
        document.body.appendChild(tip);
        return;
    }
    console.log('✅ DeepSeek 配置已加载');
    console.log('   API 地址:', getApiUrl());
    console.log('   模型:', getModel());

    // ========== 高校邦题目提取器 ==========
    function extractQuestion() {
        const selectors = [
            '.exam-question', '.question-title', '.quiz-question',
            '.question-content', '.subject-title', '.stem',
            '.question-item .title', '.exam-item .title'
        ];
        for (let sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el.innerText.trim();
        }
        const container = document.querySelector('.question-panel, .exam-panel, .quiz-panel, .paper-content');
        if (container) {
            const title = container.querySelector('h3, h4, .title, .text');
            if (title) return title.innerText.trim();
        }
        return null;
    }

    function extractOptions() {
        const options = [];
        const optionItems = document.querySelectorAll('.option-item, .exam-option, .choice-item, .question-option, li');
        if (optionItems.length) {
            optionItems.forEach(el => {
                const text = el.innerText.trim();
                if (text && /^[A-Z][\.、\s]/.test(text)) options.push(text);
                else if (text) options.push(text);
            });
        } else {
            document.querySelectorAll('label').forEach(el => {
                const text = el.innerText.trim();
                if (text && /^[A-Z][\.、\s]/.test(text)) options.push(text);
            });
        }
        return [...new Set(options.filter(opt => opt.length > 0))];
    }

    // ========== AI 答题核心 ==========
    async function answerCurrentQuestion() {
        const apiKeyNow = getApiKey();
        if (!apiKeyNow) {
            alert('请先通过脚本菜单设置 API Key！');
            return;
        }

        const question = extractQuestion();
        if (!question) {
            alert('❌ 未检测到题目，请确保在考试/测验页面');
            return;
        }
        const options = extractOptions();
        if (!options.length) {
            alert('❌ 未检测到选项');
            return;
        }

        const optionsText = options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n');
        const prompt = `请回答以下题目，只返回正确答案的字母（如 A, B, C 或 AB）：\n题目：${question}\n选项：\n${optionsText}`;

        const apiUrl = getApiUrl();
        const model = getModel();

        console.log('🤖 正在调用 AI...');
        console.log('   API 地址:', apiUrl);
        console.log('   模型:', model);
        console.log('   题目:', question);
        console.log('   选项:', optionsText);

        GM_xmlhttpRequest({
            method: 'POST',
            url: apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKeyNow}`
            },
            data: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: '你是一个考试答题助手，只返回正确答案的字母，不要任何解释。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1
            }),
            onload: function(resp) {
                try {
                    const data = JSON.parse(resp.responseText);
                    const answer = data.choices[0].message.content.trim();
                    console.log('✅ AI 答案:', answer);
                    selectOption(answer);
                } catch (e) {
                    console.error('解析 AI 响应失败:', e);
                    alert('AI 响应解析失败，请查看控制台');
                }
            },
            onerror: function(err) {
                console.error('API 请求失败:', err);
                alert('AI 调用失败，请检查网络或 API 地址是否正确。\n如果使用非官方域名，请确保 @connect 已添加该域名。');
            }
        });
    }

    // ========== 选项选择 ==========
    function selectOption(answer) {
        const letters = answer.match(/[A-D]/gi);
        if (!letters) {
            console.warn('⚠️ 未识别到有效答案字母:', answer);
            alert('AI 返回的答案格式异常: ' + answer);
            return;
        }

        const optionEls = document.querySelectorAll('.option-item, .exam-option, .choice-item, .question-option');
        if (optionEls.length) {
            letters.forEach(letter => {
                const index = letter.toUpperCase().charCodeAt(0) - 65;
                if (index < optionEls.length) {
                    const input = optionEls[index].querySelector('input[type="radio"], input[type="checkbox"]');
                    if (input) {
                        input.checked = true;
                        input.click();
                    }
                }
            });
        } else {
            const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            letters.forEach(letter => {
                const index = letter.toUpperCase().charCodeAt(0) - 65;
                if (inputs[index]) {
                    inputs[index].checked = true;
                    inputs[index].click();
                }
            });
        }
        console.log('📌 已选择:', letters.join(', '));
    }

    // ========== 添加浮动控制面板 ==========
    function addControlPanel() {
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.right = '20px';
        panel.style.zIndex = 9999;
        panel.style.background = '#1fb6ff';
        panel.style.color = 'white';
        panel.style.padding = '12px 18px';
        panel.style.borderRadius = '12px';
        panel.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        panel.style.display = 'flex';
        panel.style.alignItems = 'center';
        panel.style.gap = '12px';
        panel.style.fontFamily = 'Arial, sans-serif';

        const status = document.createElement('span');
        status.innerText = '🤖 AI 就绪';
        status.style.fontWeight = 'bold';

        const btn = document.createElement('button');
        btn.innerText = '答题';
        btn.style.background = 'white';
        btn.style.color = '#1fb6ff';
        btn.style.border = 'none';
        btn.style.padding = '6px 16px';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '14px';
        btn.onclick = () => {
            status.innerText = '🤖 AI 思考中...';
            answerCurrentQuestion().finally(() => {
                status.innerText = '🤖 AI 就绪';
            });
        };

        panel.appendChild(status);
        panel.appendChild(btn);
        document.body.appendChild(panel);
    }

    setTimeout(addControlPanel, 1500);

})();