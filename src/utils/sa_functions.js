/**
 * 
 * @param {string} message 
 * @param {object[]} actions - Array of action objects
 * @param {string} actions[].text - Action text
 * @param {function} actions[].onclick - Action onclick function
 * @param {"primary"|"danger"|"secondary"} actions[].type - Action onclick function
 * @returns 
 */

export const SA_PROMPT = (message, actions) => {
    return new Promise((resolve, reject) => {
        const body = document.querySelector('body');
        const modal = document.createElement('div');
        modal.className = 'sa-prompt-modal';

        modal.innerHTML = `
            <div class="sa-prompt-container">
                <div class="sa-prompt-message">${message}</div>
                <div class="sa-prompt-actions">
                    ${actions.map(action => `<button class="sa-prompt-action $sa-prompt-action-${action.type ?? 'primary'}">${action.text}</button>`).join('')}
                </div>
            </div>
        `

        body.appendChild(modal);

        actions.forEach((action, index) => {
            modal.querySelector(`.sa-prompt-action:nth-child(${index + 1})`).addEventListener('click', () => {
                action.onclick?.();
                modal.remove();
                resolve(action.text);
            })
        })

    })
}

/**
 * 
 * @param {string} message
 * @param {'error' | 'success' | 'warning' | 'info'} type - 'error' | 'success' | 'warning' | 'info'
 * @returns
 */
  
export const SA_ALERT = (message, type = 'error') => {
    return new Promise((resolve) => {
        const body = document.querySelector('body');
        const modal = document.createElement('div');
        modal.className = 'sa-alert-modal';

        modal.innerHTML = `
            <div class="sa-alert-container">
                <div class="sa-alert-message">${message}</div>
                <div class="sa-alert-actions sa-alert-type-${type}">
                    <button class="sa-alert-action">OK</button>
                </div>
            </div>
        `

        body.appendChild(modal);

        modal.querySelector('.sa-alert-action').addEventListener('click', () => {
            modal.remove();
            resolve();
        })

    })
}