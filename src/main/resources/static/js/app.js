(function() {
    'use strict';

    const API_BASE = '/api/prompts';
    const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

    let prompts = [];
    let currentPrompt = null;
    let variables = [];
    let currentScore = 0;
    let currentView = 'welcome';
    let isDarkMode = localStorage.getItem('darkMode') === 'true';

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedFilter = debounce(() => renderPromptList(), 300);
    const debouncedHighlight = debounce((content) => {
        highlightVariables(content);
        extractVariables(content);
    }, 150);

    function init() {
        applyTheme();
        bindEvents();
        loadPrompts();
    }

    function applyTheme() {
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.getElementById('icon-sun').style.display = isDarkMode ? 'block' : 'none';
        document.getElementById('icon-moon').style.display = isDarkMode ? 'none' : 'block';
    }

    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('darkMode', isDarkMode);
        applyTheme();
    }

    function bindEvents() {
        document.getElementById('btn-new-prompt').addEventListener('click', createNewPrompt);
        document.getElementById('btn-save').addEventListener('click', savePrompt);
        document.getElementById('btn-optimize').addEventListener('click', optimizePrompt);
        document.getElementById('btn-cancel').addEventListener('click', cancelEdit);
        document.getElementById('btn-export').addEventListener('click', exportPrompts);
        document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', importPrompts);
        document.getElementById('btn-preview').addEventListener('click', previewVariables);
        document.getElementById('btn-debug').addEventListener('click', debugPrompt);
        document.getElementById('btn-close-debug').addEventListener('click', closeDebugPanel);
        document.getElementById('btn-theme').addEventListener('click', toggleDarkMode);

        document.getElementById('search-input').addEventListener('input', debouncedFilter);
        document.getElementById('category-select').addEventListener('change', filterPrompts);

        const editor = document.getElementById('prompt-editor');
        editor.addEventListener('input', handleEditorInput);
        editor.addEventListener('scroll', syncScroll);

        document.querySelectorAll('#score-stars span').forEach(star => {
            star.addEventListener('click', () => setScore(parseInt(star.dataset.score)));
            star.addEventListener('mouseenter', () => hoverScore(parseInt(star.dataset.score)));
            star.addEventListener('mouseleave', resetScoreDisplay);
        });

        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    function handleKeyboardShortcuts(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentView === 'editor' || currentView === 'debug') {
                savePrompt();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (currentView === 'debug') {
                debugPrompt();
            }
        }
        if (e.key === 'Escape') {
            if (currentView === 'debug') {
                closeDebugPanel();
            } else if (currentView === 'editor' && !currentPrompt) {
                showView('welcome');
            }
        }
    }

    function loadPrompts() {
        fetch(API_BASE)
            .then(res => res.json())
            .then(data => {
                prompts = data;
                renderPromptList();
                updateCategoryFilter();
            })
            .catch(err => showToast('加载失败: ' + err.message, 'error'));
    }

    function renderPromptList(filteredPrompts = prompts) {
        const listEl = document.getElementById('prompt-list');
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const category = document.getElementById('category-select').value;

        let filtered = filteredPrompts;
        if (searchTerm) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm) || 
                (p.description && p.description.toLowerCase().includes(searchTerm))
            );
        }
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="empty-tip">暂无 Prompt</div>';
            return;
        }

        listEl.innerHTML = filtered.map(p => `
            <div class="prompt-item ${currentPrompt && currentPrompt.id === p.id ? 'active' : ''}" data-id="${p.id}">
                <h4>${escapeHtml(p.name)}</h4>
                <p>${escapeHtml(p.description || '无描述')}</p>
                <div class="prompt-item-actions">
                    <button class="btn-icon btn-debug" data-id="${p.id}" title="调试">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${p.id}" title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.prompt-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-icon')) {
                    selectPrompt(item.dataset.id);
                }
            });
        });

        listEl.querySelectorAll('.btn-debug').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                selectPrompt(id);
                openDebugPanel(id);
            });
        });

        listEl.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                deletePromptById(id);
            });
        });
    }

    function updateCategoryFilter() {
        const categories = [...new Set(prompts.map(p => p.category).filter(Boolean))];
        const select = document.getElementById('category-select');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">全部分类</option>' + 
            categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        
        if (categories.includes(currentValue)) {
            select.value = currentValue;
        }
    }

    function filterPrompts() {
        renderPromptList();
    }

    function selectPrompt(id) {
        currentPrompt = prompts.find(p => p.id === id);
        if (!currentPrompt) return;

        variables = [];
        document.getElementById('prompt-name').value = currentPrompt.name;
        document.getElementById('prompt-editor').value = currentPrompt.content;
        document.getElementById('prompt-description').value = currentPrompt.description || '';
        document.getElementById('prompt-category').value = currentPrompt.category || '';
        document.getElementById('output-format').value = currentPrompt.outputFormat || 'text';

        handleEditorInput();
        renderPromptList();

        showView('editor');
        document.getElementById('editor-title').textContent = '编辑 Prompt';
        validateNameInput(true);
    }

    function showView(view) {
        currentView = view;
        document.getElementById('welcome-panel').classList.add('hidden');
        document.getElementById('editor-panel').classList.add('hidden');
        document.getElementById('debug-panel').classList.add('hidden');

        if (view === 'welcome') {
            document.getElementById('welcome-panel').classList.remove('hidden');
        } else if (view === 'editor') {
            document.getElementById('editor-panel').classList.remove('hidden');
        } else if (view === 'debug') {
            document.getElementById('editor-panel').classList.remove('hidden');
            document.getElementById('debug-panel').classList.remove('hidden');
        }
    }

    function createNewPrompt() {
        currentPrompt = null;
        variables = [];
        document.getElementById('prompt-name').value = '';
        document.getElementById('prompt-editor').value = '';
        document.getElementById('prompt-description').value = '';
        document.getElementById('prompt-category').value = '';
        document.getElementById('output-format').value = 'text';
        
        document.getElementById('preview-result').textContent = '';
        document.getElementById('debug-result').textContent = '';
        document.getElementById('variables-container').innerHTML = '<div class="empty-tip">请在编辑器中输入包含 {{变量}} 的内容</div>';
        document.getElementById('variable-highlight').innerHTML = '';
        
        renderPromptList();
        showView('editor');
        document.getElementById('editor-title').textContent = '新建 Prompt';
        document.getElementById('prompt-name').focus();
        validateNameInput(false);
    }

    function cancelEdit() {
        if (currentPrompt) {
            selectPrompt(currentPrompt.id);
        } else {
            showView('welcome');
        }
    }

    function handleEditorInput() {
        const content = document.getElementById('prompt-editor').value;
        highlightVariables(content);
        extractVariables(content);
    }

    function highlightVariables(content) {
        const highlightEl = document.getElementById('variable-highlight');
        const escaped = escapeHtml(content).replace(VARIABLE_PATTERN, '<span class="variable">{{$1}}</span>');
        highlightEl.innerHTML = escaped + '<br>';
    }

    function syncScroll() {
        const editor = document.getElementById('prompt-editor');
        const highlight = document.getElementById('variable-highlight');
        highlight.scrollTop = editor.scrollTop;
        highlight.scrollLeft = editor.scrollLeft;
    }

    function extractVariables(content) {
        const matches = content.match(VARIABLE_PATTERN);
        variables = matches ? [...new Set(matches.map(m => m.replace(/\{|\}/g, '')))] : [];
        renderVariableInputs();
    }

    function renderVariableInputs() {
        const container = document.getElementById('variables-container');
        
        if (variables.length === 0) {
            container.innerHTML = '<div class="empty-tip">请在编辑器中输入包含 {{变量}} 的内容</div>';
            return;
        }

        container.innerHTML = variables.map(v => `
            <div class="variable-input-group">
                <label>${escapeHtml(v)}</label>
                <input type="text" data-variable="${escapeHtml(v)}" placeholder="输入 ${escapeHtml(v)} 的值">
            </div>
        `).join('');
    }

    function previewVariables() {
        const content = document.getElementById('prompt-editor').value;
        const variableValues = {};
        
        document.querySelectorAll('#variables-container input').forEach(input => {
            variableValues[input.dataset.variable] = input.value;
        });

        const replaced = replaceVariables(content, variableValues);
        document.getElementById('preview-result').textContent = replaced;
    }

    function replaceVariables(content, values) {
        return content.replace(VARIABLE_PATTERN, (match, varName) => {
            return values[varName.trim()] || match;
        });
    }

    function openDebugPanel(id) {
        const prompt = prompts.find(p => p.id === id);
        if (!prompt) return;

        currentPrompt = prompt;
        variables = [];
        document.getElementById('debug-prompt-name').textContent = prompt.name;
        document.getElementById('prompt-editor').value = prompt.content;
        document.getElementById('output-format').value = prompt.outputFormat || 'text';
        
        handleEditorInput();
        renderVersionHistory();
        
        showView('debug');
        document.getElementById('editor-title').textContent = '编辑 Prompt';
    }

    function closeDebugPanel() {
        if (currentPrompt) {
            selectPrompt(currentPrompt.id);
        } else {
            showView('welcome');
        }
    }

    function debugPrompt() {
        if (!currentPrompt) {
            showToast('请先选择一个 Prompt', 'error');
            return;
        }

        const content = document.getElementById('prompt-editor').value;
        const variableValues = {};
        
        document.querySelectorAll('#variables-container input').forEach(input => {
            variableValues[input.dataset.variable] = input.value;
        });

        const replaced = replaceVariables(content, variableValues);
        document.getElementById('preview-result').textContent = replaced;

        showLoading(true);
        
        fetch(`${API_BASE}/${currentPrompt.id}/debug`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: replaced,
                outputFormat: document.getElementById('output-format').value
            })
        })
        .then(res => res.json())
        .then(data => {
            document.getElementById('debug-result').textContent = data.result || data.message || JSON.stringify(data, null, 2);
            showToast('调试完成', 'success');
        })
        .catch(err => {
            document.getElementById('debug-result').textContent = '调试失败: ' + err.message;
            showToast('调试失败', 'error');
        })
        .finally(() => showLoading(false));
    }

    function validateNameInput(isEdit) {
        const nameInput = document.getElementById('prompt-name');
        const name = nameInput.value.trim();
        
        nameInput.classList.remove('valid', 'invalid');
        
        if (!name) {
            return;
        }
        
        let exists;
        if (isEdit && currentPrompt) {
            exists = prompts.some(p => p.name === name && p.id !== currentPrompt.id);
        } else if (!isEdit) {
            exists = prompts.some(p => p.name === name);
        }
        
        if (exists) {
            nameInput.classList.add('invalid');
        } else {
            nameInput.classList.add('valid');
        }
    }

    function savePrompt() {
        const name = document.getElementById('prompt-name').value.trim();
        const content = document.getElementById('prompt-editor').value;
        const description = document.getElementById('prompt-description').value.trim();
        const category = document.getElementById('prompt-category').value.trim();
        const outputFormat = document.getElementById('output-format').value;

        if (!name) {
            showToast('请输入 Prompt 名称', 'error');
            document.getElementById('prompt-name').classList.add('invalid');
            return;
        }

        if (!currentPrompt) {
            const exists = prompts.some(p => p.name === name);
            if (exists) {
                showToast('名称已存在，请使用其他名称', 'warning');
                document.getElementById('prompt-name').classList.add('invalid');
                return;
            }
        } else {
            const exists = prompts.some(p => p.name === name && p.id !== currentPrompt.id);
            if (exists) {
                showToast('名称已存在，请使用其他名称', 'warning');
                document.getElementById('prompt-name').classList.add('invalid');
                return;
            }
        }

        const promptData = {
            name,
            content,
            description,
            category,
            outputFormat
        };

        const method = currentPrompt ? 'PUT' : 'POST';
        const url = currentPrompt ? `${API_BASE}/${currentPrompt.id}` : API_BASE;

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(promptData)
        })
        .then(res => res.json())
        .then(data => {
            showToast(currentPrompt ? '更新成功' : '创建成功', 'success');
            loadPrompts();
            if (!currentPrompt) {
                selectPrompt(data.id);
            }
        })
        .catch(err => showToast('保存失败: ' + err.message, 'error'));
    }

    function deletePromptById(id) {
        if (!confirm('确定要删除这个 Prompt 吗？')) {
            return;
        }

        fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
            .then(() => {
                showToast('删除成功', 'success');
                if (currentPrompt && currentPrompt.id === id) {
                    currentPrompt = null;
                    showView('welcome');
                }
                loadPrompts();
            })
            .catch(err => showToast('删除失败: ' + err.message, 'error'));
    }

    function optimizePrompt() {
        if (!currentPrompt && !document.getElementById('prompt-editor').value) {
            showToast('请先输入 Prompt 内容', 'error');
            return;
        }

        const content = document.getElementById('prompt-editor').value;
        if (!content) {
            showToast('请输入 Prompt 内容', 'error');
            return;
        }

        showLoading(true);
        
        fetch(`${API_BASE}/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        })
        .then(res => res.json())
        .then(data => {
            if (data.optimizedContent) {
                document.getElementById('prompt-editor').value = data.optimizedContent;
                handleEditorInput();
                showToast('优化完成', 'success');
            } else if (data.message) {
                showToast(data.message, 'error');
            }
        })
        .catch(err => showToast('优化失败: ' + err.message, 'error'))
        .finally(() => showLoading(false));
    }

    function renderVersionHistory() {
        const container = document.getElementById('version-history');
        
        if (!currentPrompt || !currentPrompt.versions || currentPrompt.versions.length === 0) {
            container.innerHTML = '<div class="empty-tip">暂无版本记录</div>';
            return;
        }

        const sortedVersions = [...currentPrompt.versions].sort((a, b) => b.version - a.version);
        
        container.innerHTML = sortedVersions.map(v => `
            <div class="version-item">
                <div class="version-header">
                    <span class="version-number">版本 ${v.version}</span>
                    <span class="version-date">${formatDate(v.createdAt)}</span>
                </div>
                ${v.score ? `<div class="version-score">评分: ${'★'.repeat(v.score)}${'☆'.repeat(5 - v.score)}</div>` : ''}
                <div class="version-content">${escapeHtml(v.content)}</div>
            </div>
        `).join('');
    }

    function setScore(score) {
        currentScore = score;
        
        document.querySelectorAll('#score-stars span').forEach((star, index) => {
            star.classList.toggle('active', index < score);
        });

        if (!currentPrompt || !currentPrompt.versions || currentPrompt.versions.length === 0) {
            showToast('暂无版本记录可评分', 'error');
            return;
        }

        const latestVersion = currentPrompt.versions[currentPrompt.versions.length - 1];
        
        fetch(`${API_BASE}/${currentPrompt.id}/versions/${latestVersion.id}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score })
        })
        .then(res => res.json())
        .then(data => {
            showToast('评分已保存', 'success');
            loadPrompts();
        })
        .catch(err => showToast('评分保存失败: ' + err.message, 'error'));
    }

    function hoverScore(score) {
        document.querySelectorAll('#score-stars span').forEach((star, index) => {
            star.classList.toggle('active', index < score);
        });
    }

    function resetScoreDisplay() {
        document.querySelectorAll('#score-stars span').forEach((star, index) => {
            star.classList.toggle('active', index < currentScore);
        });
    }

    function exportPrompts() {
        fetch(`${API_BASE}/export`)
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `prompts-export-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('导出成功', 'success');
            })
            .catch(err => showToast('导出失败: ' + err.message, 'error'));
    }

    function importPrompts(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                fetch(`${API_BASE}/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                })
                .then(res => res.json())
                .then(result => {
                    showToast('导入成功', 'success');
                    loadPrompts();
                })
                .catch(err => showToast('导入失败: ' + err.message, 'error'));
            } catch (err) {
                showToast('文件格式错误', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function showLoading(show) {
        if (show) {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.id = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
        } else {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.remove();
        }
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    window.toggleDarkMode = toggleDarkMode;

    document.addEventListener('DOMContentLoaded', init);
})();
