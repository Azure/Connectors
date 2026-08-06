function esc(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[char]));
}

export function renderSubscriptionPicker(subscriptions = [], preselectedId = "") {
    const options = subscriptions.map((subscription) => {
        const id = String(subscription.id || "");
        const name = String(subscription.name || id);
        const search = `${name} ${id}`.toLowerCase();
        return `<option value="${esc(id)}" data-name="${esc(name)}" data-search="${esc(search)}"${id === preselectedId ? " selected" : ""}>${esc(name)}</option>`;
    }).join("");
    const selected = subscriptions.find((subscription) => String(subscription.id || "") === preselectedId);
    const selectedName = selected ? String(selected.name || selected.id || "") : "";
    const disabled = subscriptions.length === 0;

    return `<div class="subscription-picker">
        <label id="sub-label" for="sub-combobox">Subscription</label>
        <div class="subscription-combobox-control">
            <input id="sub-combobox" class="subscription-combobox-input" type="text" role="combobox"
                aria-autocomplete="list" aria-expanded="false" aria-controls="sub-listbox"
                aria-labelledby="sub-label" aria-describedby="sub-status" autocomplete="off" spellcheck="false"
                placeholder="${disabled ? "No subscriptions available" : "Search subscriptions by name or ID\u2026"}"
                value="${esc(selectedName)}"${disabled ? " disabled" : ""}>
            <button id="sub-clear" class="subscription-clear" type="button" aria-label="Clear subscription"${selectedName ? "" : " hidden"}>&times;</button>
            <ul id="sub-listbox" class="subscription-listbox" role="listbox" aria-label="Subscriptions" hidden></ul>
        </div>
        <div id="sub-status" class="sr-only" aria-live="polite"></div>
        <select id="sub-select" hidden aria-hidden="true" tabindex="-1"${disabled ? " disabled" : ""}>
            <option value=""></option>
            ${options}
        </select>
    </div>`;
}

export function subscriptionPickerStyles() {
    return `
.sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
.subscription-picker { position: relative; }
.subscription-combobox-control { position: relative; }
.subscription-combobox-input {
    width: 100%; padding: .5rem 2rem .5rem .75rem; border-radius: 4px;
    border: 1px solid var(--border-strong); background: var(--bg); color: var(--fg);
    font: inherit; font-size: .9rem;
}
.subscription-combobox-input:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent);
}
.subscription-combobox-input:disabled { opacity: .55; cursor: not-allowed; }
.subscription-clear {
    position: absolute; top: 50%; right: .35rem; transform: translateY(-50%);
    width: 1.6rem; height: 1.6rem; padding: 0; border: 0; border-radius: 4px;
    background: transparent; color: var(--fg-muted); font: inherit; font-size: 1rem;
    line-height: 1; cursor: pointer;
}
.subscription-clear:hover { background: var(--bg-hover); color: var(--fg); }
.subscription-listbox {
    position: absolute; z-index: 20; top: calc(100% + 4px); left: 0; right: 0;
    max-height: 280px; overflow-y: auto; margin: 0; padding: .25rem;
    list-style: none; border: 1px solid var(--border-strong); border-radius: 6px;
    background: var(--bg); box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
}
.subscription-option {
    display: block; width: 100%; padding: .48rem .55rem; border-radius: 4px;
    cursor: pointer;
}
.subscription-option.active { background: var(--bg-hover); }
.subscription-option-name {
    display: block; color: var(--fg); font-size: .84rem; font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.subscription-option-id {
    display: block; margin-top: .12rem; color: var(--fg-muted);
    font-family: var(--font-mono, "SFMono-Regular", Consolas, monospace);
    font-size: .68rem; overflow-wrap: anywhere;
}
.subscription-no-match {
    padding: .7rem .55rem; color: var(--fg-muted); font-size: .8rem; text-align: center;
}`;
}

export function filterSubscriptions(subscriptions, query) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return [...subscriptions];
    return subscriptions.filter((subscription) =>
        String(subscription.search || `${subscription.name || ""} ${subscription.id || ""}`)
            .toLowerCase()
            .includes(normalized));
}

export function createSubscriptionPicker(select, filterRecords) {
    const root = select.closest(".subscription-picker");
    const input = root.querySelector('[role="combobox"]');
    const clearButton = root.querySelector(".subscription-clear");
    const listbox = root.querySelector('[role="listbox"]');
    const status = root.querySelector('[aria-live="polite"]');
    let options = [];
    let filtered = [];
    let activeIndex = -1;
    let filterTimer = null;
    let open = false;

    function readOptions() {
        return [...select.options].filter((option) => option.value).map((option, index) => ({
            id: option.value,
            name: option.dataset.name || option.textContent || option.value,
            search: option.dataset.search || `${option.dataset.name || option.textContent || ""} ${option.value}`.toLowerCase(),
            index,
        }));
    }

    function selectedOption() {
        return options.find((option) => option.id === select.value);
    }

    function announce(message) {
        status.textContent = "";
        requestAnimationFrame(() => { status.textContent = message; });
    }

    function updateClearButton() {
        clearButton.hidden = !input.value;
        clearButton.disabled = input.disabled;
    }

    function restoreCommittedValue() {
        const selected = selectedOption();
        input.value = selected ? selected.name : "";
        updateClearButton();
    }

    function close() {
        clearTimeout(filterTimer);
        open = false;
        activeIndex = -1;
        listbox.hidden = true;
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
    }

    function setActive(index) {
        const items = [...listbox.querySelectorAll('[role="option"]')];
        for (const item of items) item.classList.remove("active");
        if (!items.length) {
            activeIndex = -1;
            input.removeAttribute("aria-activedescendant");
            return;
        }
        activeIndex = Math.max(0, Math.min(index, items.length - 1));
        const item = items[activeIndex];
        item.classList.add("active");
        input.setAttribute("aria-activedescendant", item.id);
        item.scrollIntoView({ block: "nearest" });
    }

    function choose(option) {
        const changed = select.value !== option.id;
        select.value = option.id;
        input.value = option.name;
        updateClearButton();
        close();
        if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
        announce(`${option.name} selected`);
        input.focus();
    }

    function renderList(query = input.value) {
        if (input.disabled) return;
        filtered = filterRecords(options, query);
        listbox.replaceChildren();

        if (!filtered.length) {
            const empty = document.createElement("li");
            empty.className = "subscription-no-match";
            empty.setAttribute("role", "presentation");
            empty.textContent = "No subscriptions match your search.";
            listbox.appendChild(empty);
        } else {
            filtered.forEach((option, index) => {
                const item = document.createElement("li");
                item.id = `${listbox.id}-option-${option.index}`;
                item.className = "subscription-option";
                item.setAttribute("role", "option");
                item.setAttribute("aria-selected", option.id === select.value ? "true" : "false");

                const name = document.createElement("span");
                name.className = "subscription-option-name";
                name.textContent = option.name;
                const id = document.createElement("code");
                id.className = "subscription-option-id";
                id.textContent = option.id;
                item.append(name, id);

                item.addEventListener("pointermove", () => setActive(index));
                item.addEventListener("pointerdown", (event) => event.preventDefault());
                item.addEventListener("click", () => choose(option));
                listbox.appendChild(item);
            });
        }

        open = true;
        activeIndex = -1;
        listbox.hidden = false;
        input.setAttribute("aria-expanded", "true");
        input.removeAttribute("aria-activedescendant");
        announce(filtered.length ? `${filtered.length} subscription${filtered.length === 1 ? "" : "s"}` : "No subscriptions match");
    }

    function clearSelection({ focus = true, showOptions = false } = {}) {
        const changed = !!select.value;
        select.value = "";
        input.value = "";
        updateClearButton();
        close();
        if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
        if (focus) input.focus();
        if (showOptions && !input.disabled) renderList("");
    }

    function refresh(message = "") {
        options = readOptions();
        const selected = selectedOption();
        const disabled = select.disabled || options.length === 0;
        input.disabled = disabled;
        input.placeholder = message || (options.length ? "Search subscriptions by name or ID\u2026" : "No subscriptions available");

        if (selected) {
            input.value = selected.name;
        } else {
            select.value = "";
            input.value = "";
        }

        updateClearButton();
        close();
        announce(message || (options.length ? `${options.length} subscriptions available` : "No subscriptions available"));
        return options.length;
    }

    input.addEventListener("input", () => {
        updateClearButton();
        clearTimeout(filterTimer);
        filterTimer = setTimeout(() => renderList(input.value), 120);
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            clearTimeout(filterTimer);
            if (!open) {
                renderList(select.value ? "" : input.value);
                const selectedIndex = filtered.findIndex((option) => option.id === select.value);
                setActive(selectedIndex >= 0
                    ? selectedIndex
                    : event.key === "ArrowDown" ? 0 : filtered.length - 1);
            } else {
                setActive(event.key === "ArrowDown" ? activeIndex + 1 : activeIndex - 1);
            }
            return;
        }
        if (event.key === "Enter" && open) {
            const option = activeIndex >= 0 ? filtered[activeIndex] : filtered.length === 1 ? filtered[0] : null;
            if (option) {
                event.preventDefault();
                choose(option);
            }
            return;
        }
        if (event.key === "Escape") {
            if (open || select.value) {
                event.preventDefault();
                close();
                restoreCommittedValue();
            } else if (input.value) {
                event.preventDefault();
                clearSelection();
            }
            return;
        }
        if (event.key === "Tab") {
            close();
            restoreCommittedValue();
        }
    });

    input.addEventListener("focus", () => {
        if (select.value) input.select();
        else if (input.value) renderList(input.value);
    });
    input.addEventListener("blur", () => {
        setTimeout(() => {
            if (!root.contains(document.activeElement)) {
                close();
                restoreCommittedValue();
            }
        }, 0);
    });
    input.addEventListener("click", () => {
        if (select.value) input.select();
        renderList(select.value ? "" : input.value);
    });
    clearButton.addEventListener("click", () => clearSelection({ showOptions: true }));
    document.addEventListener("pointerdown", (event) => {
        if (!root.contains(event.target)) {
            close();
            restoreCommittedValue();
        }
    });

    refresh();
    return {
        refresh,
        close,
        clear: clearSelection,
        get count() { return options.length; },
    };
}
