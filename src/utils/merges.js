import jSuites from "jsuites";

import { getColumnNameFromId, getIdFromColumnName } from "./internalHelpers.js";
import { getWorksheetInstance, updateCell } from "./internal.js";
import { setHistory } from "./history.js";
import dispatch from "./dispatch.js";
import { updateSelection } from "./selection.js";
import { getCellNameFromCoords } from "./helpers.js";
import _ from "lodash";

/**
 * Is column merged
 */
export const isColMerged = function(x, insertBefore) {
    const obj = this;

    const cols = [];
    // Remove any merged cells
    if (obj.options.mergeCells) {
        const keys = Object.keys(obj.options.mergeCells);
        for (let i = 0; i < keys.length; i++) {
            const info = getIdFromColumnName(keys[i], true);
            const colspan = obj.options.mergeCells[keys[i]][0];
            const x1 = info[0];
            const x2 = info[0] + (colspan > 1 ? colspan - 1 : 0);

            if (insertBefore == null) {
                if ((x1 <= x && x2 >= x)) {
                    cols.push(keys[i]);
                }
            } else {
                if (insertBefore) {
                    if ((x1 < x && x2 >= x)) {
                        cols.push(keys[i]);
                    }
                } else {
                    if ((x1 <= x && x2 > x)) {
                        cols.push(keys[i]);
                    }
                }
            }
        }
    }

    return cols;
}

/**
 * Is rows merged
 */
export const isRowMerged = function(y, insertBefore) {
    const obj = this;

    const rows = [];
    // Remove any merged cells
    if (obj.options.mergeCells) {
        const keys = Object.keys(obj.options.mergeCells);
        for (let i = 0; i < keys.length; i++) {
            const info = getIdFromColumnName(keys[i], true);
            const rowspan = obj.options.mergeCells[keys[i]][1];
            const y1 = info[1];
            const y2 = info[1] + (rowspan > 1 ? rowspan - 1 : 0);

            if (insertBefore == null) {
                if ((y1 <= y && y2 >= y)) {
                    rows.push(keys[i]);
                }
            } else {
                if (insertBefore) {
                    if ((y1 < y && y2 >= y)) {
                        rows.push(keys[i]);
                    }
                } else {
                    if ((y1 <= y && y2 > y)) {
                        rows.push(keys[i]);
                    }
                }
            }
        }
    }

    return rows;
}

/**
 * Merge cells
 * @param cellName
 * @param colspan
 * @param rowspan
 * @param ignoreHistoryAndEvents
 */
export const getMerge = function(cellName) {
    const obj = this;

    let data = {};
    if (cellName) {
        if (obj.options.mergeCells && obj.options.mergeCells[cellName]) {
            data = [ obj.options.mergeCells[cellName][0], obj.options.mergeCells[cellName][1] ];
        } else {
            data = null;
        }
    } else {
        if (obj.options.mergeCells) {
            var mergedCells = obj.options.mergeCells;
            const keys = Object.keys(obj.options.mergeCells);
            for (let i = 0; i < keys.length; i++) {
                data[keys[i]] = [ obj.options.mergeCells[keys[i]][0], obj.options.mergeCells[keys[i]][1] ];
            }
        }
    }

    return data;
}

const getSpan = (v) => {
    try {
        return parseInt(v) || 1;
    } catch (e) {
        return 1;
    }
}

const safeTrim = (v) => {
    try {
        return v.toString().trim();
    } catch (e) {
        return v;
    }
}


export const SA_setMerge = function ({
    cellName,
    colspan = 1,
    rowspan = 1,
    ignoreHistoryAndEvents,
    reMarging = false, // When unmerging cells, if we detect any merged cells inside it, we need to remerge that portion.
    mergeMode = 'top-left',
}) {
    const obj = this;

    console.log({mergeMode})

    if(colspan === 1 && rowspan === 1) {
        // TODO: SA_ERROR + return
        throw new Error("Invalid merge: Atleast two cells need to merge!!")
    }

    const cell = getIdFromColumnName(cellName, true);

    const topLeftX = cell[1];
    const topLeftY = cell[0];
    const bottomRightX = topLeftX + rowspan - 1
    const bottomRightY = topLeftY + colspan - 1;

    const backup = {
        topLeftX,
        topLeftY,
        bottomRightX,
        bottomRightY,
        cellValues: {}
    }

    let topLeftValue = obj.options.data[topLeftX][topLeftY]
    let spaceSeparatedValue = "";
    let anyMergeCells = false;
    let askingForUnMerge = !!obj.records[topLeftX][topLeftY].element.getAttribute('data-merged');

    const mergeCellIndices = {};
    const topLeftMergeCells = {};
    for (let x = topLeftX; x <= bottomRightX; x++) {
        for (let y = topLeftY; y <= bottomRightY; y++) {
            if(mergeCellIndices[`${x}-${y}`]) continue;

            // TODO: Skip iterations by row/colSpan

            const name = getCellNameFromCoords(y, x)
            const isMerged = !!obj.records[x][y].element.getAttribute('data-merged')
            const rSpan = getSpan(obj.records[x][y].element.rowSpan);
            const cSpan = getSpan(obj.records[x][y].element.colSpan);

            askingForUnMerge = askingForUnMerge || (name === cellName && isMerged && rSpan === rowspan && cSpan === colspan);

            anyMergeCells = anyMergeCells || isMerged;

            backup.cellValues[name] = {
                value: obj.options.data[x][y],
                element: obj.records[x][y].element,
                isMerged: isMerged,
                rowspan: rSpan,
                colspan: cSpan,
            }

            if(isMerged) {
                topLeftMergeCells[`${x}-${y}`] = true;
                for(let m = x; m < x + rSpan; m++) {
                    for(let n = y; n < y + cSpan; n++) {
                        mergeCellIndices[`${m}-${n}`] = true;
                    }
                }
            }

            const textContent = safeTrim(obj.options.data[x][y])
            if(textContent) spaceSeparatedValue += obj.options.data[x][y] + ' ';
            if(askingForUnMerge) break;
        }
        spaceSeparatedValue = safeTrim(spaceSeparatedValue) +  '\n';
        if(askingForUnMerge) break;
    }

    spaceSeparatedValue = safeTrim(spaceSeparatedValue)

    backup.topLeftValue = topLeftValue;
    backup.spaceSeparatedValue = spaceSeparatedValue.trim();

    if(anyMergeCells) {
        for (let key in topLeftMergeCells) {
            const [x, y] = key.split("-").map((k => parseInt(k, 10)));
            const cellName = getCellNameFromCoords(y, x); // Like: C1, B5
            SA_removeMerge.call(obj, {
                cellName, 
                keepOptions: !askingForUnMerge, 
                ignoreHistoryAndEvents: !askingForUnMerge
            });
        }

        if(askingForUnMerge) return;
    }

    if (colspan > 1) obj.records[topLeftX][topLeftY].element.setAttribute('colspan', colspan);
    if (rowspan > 1) obj.records[topLeftX][topLeftY].element.setAttribute('rowspan', rowspan);

    if (!obj.options.mergeCells) obj.options.mergeCells = {};
    if (!obj.options.saMergeCells) obj.options.saMergeCells = {};

    let prevEls = _.cloneDeep(obj.options.mergeCells?.[cellName]?.[2] ?? []);
    let prevBackup = _.cloneDeep(obj.options.saMergeCells?.[cellName]?.[2] ?? {});

    obj.options.mergeCells[cellName] = [ colspan, rowspan, [] ];
    obj.options.saMergeCells[cellName] = [ colspan, rowspan, backup ];
    obj.records[topLeftX][topLeftY].element.setAttribute('data-merged', 'true');
    obj.records[topLeftX][topLeftY].element.style.overflow = 'hidden';

    const data = [];
    for (let x = topLeftX; x <= bottomRightX; x++) {
        for (let y = topLeftY; y <= bottomRightY; y++) {
            if (! (topLeftY == y && topLeftX == x)) {
                data.push(obj.options.data[x][y]);
                updateCell.call(obj, y, x, '', true);
                obj.options.mergeCells[cellName][2].push(obj.records[x][y].element);
                obj.records[x][y].element.style.display = 'none';
                obj.records[x][y].element = obj.records[topLeftX][topLeftY].element;
            }
        }
    }

    updateSelection.call(obj, obj.records[topLeftX][topLeftY].element);

    if(reMarging) {
        obj.options.mergeCells[cellName][2] = prevEls;
        obj.options.saMergeCells[cellName][2] = prevBackup;
    }

    if (! ignoreHistoryAndEvents) {
        console.log("History for SA_setMerge: cellName=",cellName, "rowspan=",rowspan, "colspan=" , colspan);
        setHistory.call(obj, {
            action: 'SA_setMerge',
            payload: {
                cellName,
                rowspan,
                colspan,
            }
        })

        dispatch.call(obj, 'onmerge', obj, { [cellName]: [colspan, rowspan]});
    }
}

export const SA_removeMerge = function({
    cellName,
    keepOptions = false,
    ignoreHistoryAndEvents = false
}) {
    const obj = this;

    if (!(obj.options.mergeCells && obj.options.mergeCells[cellName])) {
        // Note: Don't throw exception
        console.error("Invalid merge request: cellName=",cellName)
        return
    }

    const mergeCellsObj = obj.options.mergeCells[cellName]
    const saMergeCellsObj = obj.options.saMergeCells[cellName]

    if(!keepOptions) {
        delete obj.options.mergeCells[cellName]
        delete obj.options.saMergeCells[cellName]
    }
    
    const [y, x] = getIdFromColumnName(cellName, true); // [y, x]
    obj.records[x][y].element.removeAttribute('colspan');
    obj.records[x][y].element.removeAttribute('rowspan');
    obj.records[x][y].element.removeAttribute('data-merged');
    const [colspan, rowspan, elements] = mergeCellsObj;

    let index = 0, rs, cs;
    const backupCellValues = saMergeCellsObj[2].cellValues;
    const reMergePayloads = [];

    for (rs = 0; rs < rowspan; rs++) {
        for (cs = 0; cs < colspan; cs++) {
            if (rs > 0 || cs > 0) {
                obj.records[x+rs][y+cs].element = elements[index++];
                obj.records[x+rs][y+cs].element.style.display = '';

                const name = getCellNameFromCoords(y+cs, x+rs);

                if(name in backupCellValues && 'value' in backupCellValues[name]) {
                    const bkp = backupCellValues[name]
                    updateCell.call(obj, y+cs, x+rs, bkp.value);

                    if(bkp.isMerged && !keepOptions) {
                        reMergePayloads.push({
                            cellName: name,
                            colspan: bkp.colspan,
                            rowspan: bkp.rowspan,
                            ignoreHistoryAndEvents: true,
                            reMarging: true
                        })
                    }
                }
            }
        }
    }

    for(const payload of reMergePayloads) {
        SA_setMerge.call(obj, payload);
    }

    updateSelection.call(obj, obj.records[x][y].element, obj.records[x+rs-1][y+cs-1].element);

    if (!ignoreHistoryAndEvents) {
        console.log("History for SA_removeMerge: cellName=",cellName, "rowspan=", rowspan, "colspan=" , colspan);

        setHistory.call(obj, {
            action: 'SA_removeMerge',
            payload: {
                cellName,
                rowspan,
                colspan,
            }
        })
    }
}

// TODO: Replace these type of alerts: alert(jSuites.translate(test));
// TODO: SA_PROMPT (message, actions[]) -> action 
// TODO: SA_ERROR (message) -> void

export const mergeActiveCells = function () {
    // TODO: ADD PROMPT HERE
    // const mergeType = await SA_Prompt("What type of merge you need?", [{message: "top-left"}, {message: "joined"}, {message: "cancel"}])

    const worksheet = getWorksheetInstance.call(this);

    const selectedCells = worksheet.selectedContainer;
    if (selectedCells?.length !== 4) {
        throw new Error('Invalid selected cells');
    }

    const [topLeftY, topLeftX, bottomRightY, bottomRightX] = selectedCells;

    let cellName = getCellNameFromCoords(topLeftY, topLeftX); // Like: B22, C1, B5
    
    let colspan = bottomRightY - topLeftY + 1;
    let rowspan = bottomRightX - topLeftX + 1;

    if (colspan !== 1 || rowspan !== 1) {
        worksheet.SA_setMerge({
            cellName,
            rowspan,
            colspan,
        })
    }
}

/**
 * Merge cells
 * @param cellName
 * @param colspan
 * @param rowspan
 * @param ignoreHistoryAndEvents
 */
export const setMerge = function(cellName, colspan, rowspan, ignoreHistoryAndEvents) {
    const obj = this;
    let test = false;

    if (! cellName) {
        if (! obj.highlighted.length) {
            alert(jSuites.translate('No cells selected'));
            return null;
        } else {
            const x1 = parseInt(obj.highlighted[0].getAttribute('data-x'));
            const y1 = parseInt(obj.highlighted[0].getAttribute('data-y'));
            const x2 = parseInt(obj.highlighted[obj.highlighted.length-1].getAttribute('data-x'));
            const y2 = parseInt(obj.highlighted[obj.highlighted.length-1].getAttribute('data-y'));
            cellName = getColumnNameFromId([ x1, y1 ]);
            colspan = (x2 - x1) + 1;
            rowspan = (y2 - y1) + 1;
        }
    } else if (typeof cellName !== 'string') {
        return null
    }

    const cell = getIdFromColumnName(cellName, true);

    if (obj.options.mergeCells && obj.options.mergeCells[cellName]) {
        if (obj.records[cell[1]][cell[0]].element.getAttribute('data-merged')) {
            test = 'Cell already merged';
        }
    } else if ((! colspan || colspan < 2) && (! rowspan || rowspan < 2)) {
        test = 'Invalid merged properties';
    } else {
        var cells = [];
        for (let j = cell[1]; j < cell[1] + rowspan; j++) {
            for (let i = cell[0]; i < cell[0] + colspan; i++) {
                var columnName = getColumnNameFromId([i, j]);
                if (obj.records[j][i].element.getAttribute('data-merged')) {
                    test = 'There is a conflict with another merged cell';
                }
            }
        }
    }

    if (test) {
        alert(jSuites.translate(test));
    } else {
        // Add property
        if (colspan > 1) {
            obj.records[cell[1]][cell[0]].element.setAttribute('colspan', colspan);
        } else {
            colspan = 1;
        }
        if (rowspan > 1) {
            obj.records[cell[1]][cell[0]].element.setAttribute('rowspan', rowspan);
        } else {
            rowspan = 1;
        }
        // Keep links to the existing nodes
        if (!obj.options.mergeCells) {
            obj.options.mergeCells = {};
        }

        obj.options.mergeCells[cellName] = [ colspan, rowspan, [] ];
        // Mark cell as merged
        obj.records[cell[1]][cell[0]].element.setAttribute('data-merged', 'true');
        // Overflow
        obj.records[cell[1]][cell[0]].element.style.overflow = 'hidden';
        // History data
        const data = [];
        // Adjust the nodes
        for (let y = cell[1]; y < cell[1] + rowspan; y++) {
            for (let x = cell[0]; x < cell[0] + colspan; x++) {
                if (! (cell[0] == x && cell[1] == y)) {
                    data.push(obj.options.data[y][x]);
                    updateCell.call(obj, x, y, '', true);
                    obj.options.mergeCells[cellName][2].push(obj.records[y][x].element);
                    obj.records[y][x].element.style.display = 'none';
                    obj.records[y][x].element = obj.records[cell[1]][cell[0]].element;
                }
            }
        }
        // In the initialization is not necessary keep the history
        updateSelection.call(obj, obj.records[cell[1]][cell[0]].element);

        if (! ignoreHistoryAndEvents) {
            setHistory.call(obj, {
                action:'setMerge',
                column:cellName,
                colspan:colspan,
                rowspan:rowspan,
                data:data,
            });

            dispatch.call(obj, 'onmerge', obj, { [cellName]: [colspan, rowspan]});
        }
    }
}


/**
 * Remove merge by cellname
 * @param cellName
 */
export const removeMerge = function(cellName, data, keepOptions) {
    const obj = this;

    if (obj.options.mergeCells && obj.options.mergeCells[cellName]) {
        const cell = getIdFromColumnName(cellName, true); // [y, x]
        obj.records[cell[1]][cell[0]].element.removeAttribute('colspan');
        obj.records[cell[1]][cell[0]].element.removeAttribute('rowspan');
        obj.records[cell[1]][cell[0]].element.removeAttribute('data-merged');
        const info = obj.options.mergeCells[cellName];

        let index = 0;
        let j, i;

        for (j = 0; j < info[1]; j++) {
            for (i = 0; i < info[0]; i++) {
                if (j > 0 || i > 0) {
                    obj.records[cell[1]+j][cell[0]+i].element = info[2][index];
                    obj.records[cell[1]+j][cell[0]+i].element.style.display = '';
                    // Recover data
                    if (data && data[index]) {
                        updateCell.call(obj, cell[0]+i, cell[1]+j, data[index]);
                    }
                    index++;
                }
            }
        }

        // Update selection
        updateSelection.call(obj, obj.records[cell[1]][cell[0]].element, obj.records[cell[1]+j-1][cell[0]+i-1].element);

        if (! keepOptions) {
            delete(obj.options.mergeCells[cellName]);
        }
    }
}

/**
 * Remove all merged cells
 */
export const destroyMerge = function(keepOptions) {
    const obj = this;

    // Remove any merged cells
    if (obj.options.mergeCells) {
        var mergedCells = obj.options.mergeCells;
        const keys = Object.keys(obj.options.mergeCells);
        for (let i = 0; i < keys.length; i++) {
            removeMerge.call(obj, keys[i], null, keepOptions);
        }
    }
}