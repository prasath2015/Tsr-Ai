(function() {
    const chatContainer = document.getElementById('chat-container');
    const commandForm = document.getElementById('command-form');
    const commandInput = document.getElementById('command-input');
    const hero = document.getElementById('hero');
    const sidebar = document.getElementById('sidebar');
    const historyList = document.getElementById('history-list');
    const recommendationsList = document.getElementById('recommendations-list');

    let isProcessing = false;
    const sessionHistory = [];

    // Sidebar Controls
    document.getElementById('sidebar-open-btn')?.addEventListener('click', () => sidebar.classList.add('open'));
    document.getElementById('sidebar-close-btn')?.addEventListener('click', () => sidebar.classList.remove('open'));

    // ZIP Export
    window.exportProject = async () => {
        try {
            const zip = new JSZip();
            const [styleCss, indexJs, appPy] = await Promise.all([
                fetch('style.css').then(r => r.text()).catch(() => ''),
                fetch('index.js').then(r => r.text()).catch(() => ''),
                fetch('app.py').then(r => r.text()).catch(() => '')
            ]);
            
            zip.file('index.html', document.documentElement.outerHTML);
            zip.file('style.css', styleCss);
            zip.file('index.js', indexJs);
            zip.file('app.py', appPy);
            zip.file('README.md', '# Aura OS\n\n1. pip install flask flask-cors google-generativeai\n2. export API_KEY=your_key\n3. python app.py');
            
            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, 'aura-os-project.zip');
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. See console.');
        }
    };

    // Helpers
    window.issueDirective = (text) => {
        commandInput.value = text;
        commandForm.dispatchEvent(new Event('submit'));
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const appendMessage = (role, text, isError = false) => {
        if (hero) hero.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = `message ${role} ${isError ? 'error' : ''}`;

        const avatarIcon = role === 'user' ? '👤' : '⚡';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        wrapper.innerHTML = `
            <div class="message-avatar">${avatarIcon}</div>
            <div class="message-content">
                <div class="message-bubble">
                    <p>${escapeHtml(text)}</p>
                </div>
                <div class="message-time">${time}</div>
            </div>
        `;

        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        if (role === 'user') {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = text;
            historyItem.onclick = () => window.issueDirective(text);
            historyList.prepend(historyItem);
        }
    };

    // Core Logic
    const handleCommand = async (e) => {
        e.preventDefault();
        const text = commandInput.value.trim();
        if (!text || isProcessing) return;

        isProcessing = true;
        commandInput.value = '';
        appendMessage('user', text);

        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.textContent = 'Neural link calculating...';
        chatContainer.appendChild(loader);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: sessionHistory })
            });
            const data = await response.json();

            loader.remove();
            if (data.error) throw new Error(data.error);

            appendMessage('agent', data.text);
            sessionHistory.push({ role: 'user', content: text });
            sessionHistory.push({ role: 'agent', content: data.text });

            // Execute Directives
            if (data.directives?.length > 0) {
                data.directives.forEach(dir => {
                    if (dir.name === 'open_youtube') {
                        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(dir.args.query)}`, '_blank');
                    } else if (dir.name === 'search_web') {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(dir.args.query)}`, '_blank');
                    } else if (dir.name === 'open_terminal') {
                        appendMessage('agent', '🐚 Terminal directive received. (Local system access not available in browser)');
                    }
                });
            }
        } catch (err) {
            loader.remove();
            appendMessage('agent', `Interface Sync Error: ${err.message}`, true);
        } finally {
            isProcessing = false;
        }
    };

    commandForm.addEventListener('submit', handleCommand);

    // Recommendations
    const presets = [
        { label: 'YouTube Search', icon: '🎵', prompt: 'Play Lo-fi Hip Hop on YouTube' },
        { label: 'Research Web', icon: '🌐', prompt: 'Search for AI automation trends' },
        { label: 'System Check', icon: '🐚', prompt: 'Run system diagnostics' }
    ];

    presets.forEach(r => {
        const btn = document.createElement('button');
        btn.className = 'rec-btn';
        btn.innerHTML = `
            <span class="label"><span>${r.icon}</span> ${r.label}</span>
            <span class="desc">${r.prompt}</span>
        `;
        btn.onclick = () => window.issueDirective(r.prompt);
        recommendationsList.appendChild(btn);
    });
})();
