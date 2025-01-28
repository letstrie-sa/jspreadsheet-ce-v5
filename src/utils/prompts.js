export const SA_PROMPT = (message, actions) => {
    return new Promise((resolve, reject) => {
        const body = document.querySelector('body');
        const modal = document.createElement('div');
        modal.className = 'sa-prompt-modal';

        modal.innerHTML = `
            <div class="sa-prompt-backdrop"></div>
            <div class="sa-prompt-container">
                <h2 class="sa-prompt-title">Merge Options</h2>
                <p class="sa-prompt-message">${message}</p>
                <div class="sa-prompt-actions">
                    ${actions.map(action => `<button class="sa-prompt-action sa-prompt-action-${action.type ?? 'primary'}">${action.text}</button>`).join('')}
                </div>
            </div>
        `;

        body.appendChild(modal);

        actions.forEach((action, index) => {
            modal.querySelector(`.sa-prompt-action:nth-child(${index + 1})`).addEventListener('click', () => {
                action.onclick?.();
                modal.remove();
                resolve(action);
            });
        });
    });
};

export const SA_ALERT = (message, type = 'error') => {
    const body = document.querySelector('body');
    const modal = document.createElement('div');
    modal.className = 'sa-alert-modal';

    modal.innerHTML = `
        <div class="sa-alert-backdrop"></div>
        <div class="sa-alert-container sa-${type}-alert">
            <div class="sa-alert-icon sa-alert-icon-${type}"></div>
            <p class="sa-alert-message">${message}</p>
            <button class="sa-alert-action">OK</button>
        </div>
    `;

    body.appendChild(modal);

    modal.querySelector('.sa-alert-action').addEventListener('click', () => {
        modal.remove();
    });
};

const style = document.createElement('style');
style.innerHTML = `
.sa-prompt-modal,
.sa-alert-modal {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 20px;
}

.sa-prompt-container,
.sa-alert-container {
    background: #ffffff;
    border-radius: 10px;
    padding: 30px;
    width: 90%;
    max-width: 420px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-align: center;
}

.sa-prompt-title {
    font-size: 1.6rem;
    font-weight: bold;
    margin-bottom: 15px;
    color: #333;
}

.sa-prompt-message,
.sa-alert-message {
    font-size: 1.1rem;
    color: #555;
    margin-bottom: 25px;
    line-height: 1.4;
    text-align: justify;
}

.sa-prompt-actions,
.sa-alert-actions {
    display: flex;
    justify-content: space-evenly;
    gap: 15px;
}

.sa-prompt-action,
.sa-alert-action {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
}

.sa-prompt-action-primary {
    background-color: #4caf50;
    color: #ffffff;
}

.sa-prompt-action-danger {
    background-color: #f44336;
    color: #ffffff;
}

.sa-prompt-action-secondary {
    background-color: #f1f1f1;
    color: #333;
}

.sa-prompt-action:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.sa-alert-icon {
    font-size: 2.5rem;
    margin-bottom: 15px;
}

.sa-alert-icon-info {
    color: #2196f3;
}

.sa-alert-icon-error {
    color: #f44336;
}

.sa-alert-icon-success {
    color: #4caf50;
}

.sa-alert-icon-warning {
    color: #ff9800;
}
`;

document.head.appendChild(style);