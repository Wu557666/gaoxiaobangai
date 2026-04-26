// ==UserScript==
// @name         厦门理工高校邦小测AI助手
// @namespace    https://github.com/Wu557666/gaoxiaobangai
// @version      2.1.1
// @description  支持超时控制、自动重试、实时进度显示，极速并发答题
// @author       Wu557666
// @icon         https://favicon.im/xmut.gaoxiaobang.com?size=128
// @match        https://xmut.class.gaoxiaobang.com/class/*/exam/*
// @match        https://xmut.class.gaoxiaobang.com/class/*/quiz/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      api.deepseek.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const $ = window.$;
    const wait = ms => new Promise(r => setTimeout(r, ms));

    // ========== 默认配置 ==========
    const DEFAULT_API_URL = 'https://api.deepseek.com/chat/completions';
    const DEFAULT_MODEL = 'deepseek-chat';
    const DEFAULT_TIMEOUT = 15000; // 15秒
    const DEFAULT_RETRY = 1; // 重试1次
    const DEFAULT_INTERVAL = 300;

    const STORAGE_API_KEY = 'deepseek_api_key';
    const STORAGE_API_URL = 'deepseek_api_url';
    const STORAGE_MODEL = 'deepseek_model';
    const STORAGE_INTERVAL = 'deepseek_interval';
    const STORAGE_TIMEOUT = 'deepseek_timeout';
    const STORAGE_RETRY = 'deepseek_retry';

    // ========== 配置读写 ==========
    function getApiKey() { return GM_getValue(STORAGE_API_KEY, ''); }
    function setApiKey(key) { GM_setValue(STORAGE_API_KEY, key); }
    function getApiUrl() { return GM_getValue(STORAGE_API_URL, DEFAULT_API_URL); }
    function setApiUrl(url) { GM_setValue(STORAGE_API_URL, url); }
    function getModel() { return GM_getValue(STORAGE_MODEL, DEFAULT_MODEL); }
    function setModel(model) { GM_setValue(STORAGE_MODEL, model); }
    function getInterval() { return parseInt(GM_getValue(STORAGE_INTERVAL, DEFAULT_INTERVAL), 10); }
    function setIntervalMs(ms) { GM_setValue(STORAGE_INTERVAL, ms); }
    function getTimeout() { return parseInt(GM_getValue(STORAGE_TIMEOUT, DEFAULT_TIMEOUT), 10); }
    function setTimeoutMs(ms) { GM_setValue(STORAGE_TIMEOUT, ms); }
    function getRetry() { return parseInt(GM_getValue(STORAGE_RETRY, DEFAULT_RETRY), 10); }
    function setRetry(count) { GM_setValue(STORAGE_RETRY, count); }

    // ========== 设置面板（增加超时和重试） ==========
    function showSettingsPanel() {
        const oldOverlay = document.getElementById('ai-settings-overlay');
        if (oldOverlay) oldOverlay.remove();

        const apiKey = getApiKey();
        const apiUrl = getApiUrl();
        const model = getModel();
        const interval = getInterval();
        const timeout = getTimeout();
        const retry = getRetry();

        const overlay = document.createElement('div');
        overlay.id = 'ai-settings-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';

        const panel = document.createElement('div');
        panel.id = 'ai-settings-panel';
        panel.style.cssText = 'background:white;padding:24px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,0.3);width:420px;max-width:90vw;font-family:Arial,sans-serif;';

        panel.innerHTML = `
            <h2 style="margin:0 0 16px;color:#1fb6ff;font-size:20px;">🤖 考试 AI 助手设置</h2>
            <p style="margin:0 0 20px;color:#666;font-size:14px;">请输入你的 DeepSeek API Key（<a href="https://platform.deepseek.com/" target="_blank" style="color:#1fb6ff;">点击获取</a>）</p>
            
            <label style="display:block;margin-bottom:6px;font-weight:bold;color:#333;">API Key <span style="color:red;">*</span></label>
            <input type="password" id="ai-api-key-input" placeholder="sk-xxxxxxxx" value="${apiKey}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:16px;">
            
            <details style="margin-bottom:20px;">
                <summary style="cursor:pointer;color:#1fb6ff;font-size:14px;">高级设置（可选）</summary>
                <div style="margin-top:12px;">
                    <label style="display:block;margin-bottom:6px;font-weight:bold;color:#333;">API 地址</label>
                    <input type="text" id="ai-api-url-input" placeholder="${DEFAULT_API_URL}" value="${apiUrl}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px;">
                    
                    <label style="display:block;margin-bottom:6px;font-weight:bold;color:#333;">模型名称</label>
                    <input type="text" id="ai-model-input" placeholder="${DEFAULT_MODEL}" value="${model}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px;">
                    
                    <label style="display:block;margin-bottom:6px;font-weight:bold;color:#333;">请求超时(毫秒)</label>
                    <input type="number" id="ai-timeout-input" value="${timeout}" min="3000" max="60000" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px;">
                    
                    <label style="display:block;margin-bottom:6px;font-weight:bold;color:#333;">失败重试次数</label>
                    <input type="number" id="ai-retry-input" value="${retry}" min="0" max="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:12px;">
                    
                    <label style="display:block;margin-bottom:6px;font-weight:bold;color:#333;">题目间延迟(毫秒)</label>
                    <input type="number" id="ai-interval-input" value="${interval}" min="0" max="3000" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box;">
                </div>
            </details>
            
            <div style="display:flex;gap:12px;justify-content:flex-end;">
                <button id="ai-settings-cancel" style="padding:10px 20px;border:none;border-radius:8px;background:#f0f0f0;color:#666;cursor:pointer;font-size:14px;">取消</button>
                <button id="ai-settings-save" style="padding:10px 20px;border:none;border-radius:8px;background:#1fb6ff;color:white;cursor:pointer;font-size:14px;font-weight:bold;">保存并启用</button>
            </div>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.getElementById('ai-settings-cancel').onclick = () => {
            overlay.remove();
            if (!getApiKey()) {
                const tip = document.createElement('div');
                tip.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;background:#ff9800;color:white;padding:10px 15px;border-radius:8px;';
                tip.innerText = '⚠️ 未设置 API Key，无法使用';
                document.body.appendChild(tip);
                setTimeout(() => tip.remove(), 3000);
            }
        };

        document.getElementById('ai-settings-save').onclick = () => {
            const newKey = document.getElementById('ai-api-key-input').value.trim();
            const newUrl = document.getElementById('ai-api-url-input').value.trim();
            const newModel = document.getElementById('ai-model-input').value.trim();
            const newTimeout = document.getElementById('ai-timeout-input').value.trim();
            const newRetry = document.getElementById('ai-retry-input').value.trim();
            const newInterval = document.getElementById('ai-interval-input').value.trim();

            if (!newKey) {
                alert('❌ API Key 不能为空！');
                return;
            }

            setApiKey(newKey);
            if (newUrl) setApiUrl(newUrl);
            if (newModel) setModel(newModel);
            if (newTimeout) setTimeoutMs(newTimeout);
            if (newRetry) setRetry(newRetry);
            if (newInterval) setIntervalMs(newInterval);

            overlay.remove();
            alert('✅ 配置已保存！现在可以使用 AI 答题了。');
            location.reload();
        };
    }

    GM_registerMenuCommand('⚙️ 打开设置面板', showSettingsPanel);
    GM_registerMenuCommand('📋 查看当前配置', () => {
        const key = getApiKey();
        const url = getApiUrl();
        const model = getModel();
        const timeout = getTimeout();
        const retry = getRetry();
        const interval = getInterval();
        const keyPreview = key ? key.slice(0, 8) + '...' + key.slice(-4) : '未设置';
        alert(`当前配置：\n\nAPI Key: ${keyPreview}\nAPI 地址: ${url}\n模型: ${model}\n超时: ${timeout}ms\n重试: ${retry}次\n间隔: ${interval}ms`);
    });

    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn('⚠️ 未设置 DeepSeek API Key，正在打开设置面板...');
        setTimeout(showSettingsPanel, 1000);
        return;
    }
    console.log('✅ DeepSeek 配置已加载');

    // ========== 从全局变量读取题目数据 ==========
    function getQuestionsFromData() {
        return window.questionList || (typeof unsafeWindow !== 'undefined' && unsafeWindow.questionList);
    }

    // ========== 根据 answer_id 精准点击选项 ==========
    function selectOptionByAnswerId(answerId) {
        if (!answerId) return false;
        const icon = document.querySelector(`i[answer_id="${answerId}"]`);
        if (!icon) return false;

        const isSelected = icon.classList.contains('gxb-icon-radio-selected') ||
                           icon.classList.contains('gxb-icon-check-selected') ||
                           icon.classList.contains('selected');
        if (isSelected) {
            console.log(`⏭️ 选项 answer_id=${answerId} 已选中，跳过`);
            return true;
        }

        ['mousedown', 'mouseup', 'click'].forEach(type => {
            icon.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
        });
        console.log(`📌 已点击 answer_id=${answerId}`);
        return true;
    }

    // ========== 带超时和重试的请求 ==========
    function requestWithRetry(url, headers, data, timeoutMs, maxRetry) {
        return new Promise((resolve, reject) => {
            let retryCount = 0;

            const doRequest = () => {
                const startTime = Date.now();
                let timeoutId = null;
                let isResolved = false;

                const clean = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                };

                const handleSuccess = (resp) => {
                    if (isResolved) return;
                    isResolved = true;
                    clean();
                    resolve(resp);
                };

                const handleError = (err) => {
                    if (isResolved) return;
                    isResolved = true;
                    clean();

                    if (retryCount < maxRetry) {
                        retryCount++;
                        console.warn(`⚠️ 请求失败/超时，正在重试 (${retryCount}/${maxRetry})...`);
                        doRequest();
                    } else {
                        reject(err);
                    }
                };

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: url,
                    headers: headers,
                    data: data,
                    timeout: timeoutMs,
                    onload: handleSuccess,
                    onerror: handleError,
                    ontimeout: () => handleError(new Error('Request timeout'))
                });

                // 额外保险：GM_xmlhttpRequest 的 timeout 可能不触发 ontimeout，手动计时
                timeoutId = setTimeout(() => {
                    if (!isResolved) {
                        console.warn(`⏰ 请求超过 ${timeoutMs}ms，手动超时`);
                        handleError(new Error('Manual timeout'));
                    }
                }, timeoutMs + 500);
            };

            doRequest();
        });
    }

    // ========== 并发批量答题（带进度显示） ==========
    async function answerAllQuestions(statusElement) {
        const apiKeyNow = getApiKey();
        if (!apiKeyNow) {
            alert('请先设置 API Key！');
            showSettingsPanel();
            return;
        }

        const questionData = getQuestionsFromData();
        if (!questionData || questionData.length === 0) {
            alert('❌ 未获取到题目数据，可能页面还未完全加载，请刷新后重试。');
            return;
        }

        const apiUrl = getApiUrl();
        const model = getModel();
        const timeout = getTimeout();
        const maxRetry = getRetry();
        const interval = getInterval();

        const total = questionData.length;
        let completed = 0;
        const updateStatus = () => {
            if (statusElement) {
                statusElement.innerText = `🤖 答题中 ${completed}/${total}`;
            }
        };
        updateStatus();

        console.log(`🎯 共 ${total} 道题目，开始并发解答（超时:${timeout}ms, 重试:${maxRetry}次）...`);

        const promises = questionData.map(async (q, index) => {
            const questionText = q.name || q.questionName;
            const options = q.answerList || [];

            if (!questionText || options.length === 0) {
                console.warn(`⚠️ 第 ${index+1} 题数据不完整，跳过`);
                completed++;
                updateStatus();
                return;
            }

            const optionsText = options.map((opt, i) =>
                `${String.fromCharCode(65 + i)}. ${opt.text || opt}`
            ).join('\n');

            const prompt = `请回答以下题目，只返回正确答案的字母（如 A, B, C 或 AB）：\n题目：${questionText}\n选项：\n${optionsText}`;

            try {
                const resp = await requestWithRetry(
                    apiUrl,
                    {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKeyNow}`
                    },
                    JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: '你是一个考试答题助手，只返回正确答案的字母，不要任何解释。' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.1
                    }),
                    timeout,
                    maxRetry
                );

                const data = JSON.parse(resp.responseText);
                const answer = data.choices[0].message.content.trim();
                console.log(`📌 第 ${index+1} 题 AI 答案: ${answer}`);

                const letters = answer.match(/[A-D]/gi);
                if (letters) {
                    letters.forEach(letter => {
                        const optIndex = letter.toUpperCase().charCodeAt(0) - 65;
                        if (optIndex < options.length) {
                            const opt = options[optIndex];
                            if (opt.answerId) {
                                selectOptionByAnswerId(opt.answerId);
                            }
                        }
                    });
                } else {
                    console.warn(`   ⚠️ 未识别到有效答案字母: ${answer}`);
                }
            } catch (e) {
                console.error(`❌ 第 ${index+1} 题最终失败:`, e);
            } finally {
                completed++;
                updateStatus();
                if (interval > 0) {
                    await wait(interval);
                }
            }
        });

        await Promise.all(promises);
        if (statusElement) {
            statusElement.innerText = '🤖 AI 就绪';
        }
        console.log('🎉 所有题目处理完毕！');
    }

    // ========== 浮动控制面板（带进度状态） ==========
    function addControlPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9998;background:#1fb6ff;color:white;padding:12px 18px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.2);display:flex;align-items:center;gap:12px;font-family:Arial,sans-serif;';

        const status = document.createElement('span');
        status.id = 'ai-answer-status';
        status.innerText = '🤖 AI 就绪';
        status.style.fontWeight = 'bold';

        const btn = document.createElement('button');
        btn.innerText = '答本页全部';
        btn.style.cssText = 'background:white;color:#1fb6ff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:14px;';
        btn.onclick = () => {
            answerAllQuestions(status);
        };

        const settingsBtn = document.createElement('button');
        settingsBtn.innerText = '⚙️';
        settingsBtn.style.cssText = 'background:transparent;color:white;border:none;font-size:18px;cursor:pointer;padding:0 4px;';
        settingsBtn.title = '打开设置';
        settingsBtn.onclick = showSettingsPanel;

        panel.appendChild(status);
        panel.appendChild(btn);
        panel.appendChild(settingsBtn);
        document.body.appendChild(panel);
    }

    // 等待数据出现
    function waitForQuestionData() {
        return new Promise(resolve => {
            const check = () => {
                const q = getQuestionsFromData();
                if (q && q.length > 0) resolve();
                else setTimeout(check, 500);
            };
            check();
        });
    }

    (async function init() {
        await waitForQuestionData();
        addControlPanel();
    })();

})();