import { getIdFromColumnName } from "./internalHelpers.js";
import { updateCell } from "./internal.js";
import { setHistory } from "./history.js";
import dispatch from "./dispatch.js";
import { updateSelection } from "./selection.js";
import { getCellNameFromCoords } from "./helpers.js";
import _ from "lodash";
import { setStyle } from "./style.js";

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
    dispatchEvent = true,
}) {
    const obj = this;

    if(colspan === 1 && rowspan === 1) {
        console.error("Invalid merge: Atleast two cells need to merge!!")
        return
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
        mergeMode,
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
    backup.value = mergeMode === 'combine' ? backup.spaceSeparatedValue : backup.topLeftValue;

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
    obj.records[topLeftX][topLeftY].element.setAttribute('data-merge-src', cellName);
    obj.records[topLeftX][topLeftY].element.style.overflow = 'hidden';

    let topLeftCellValue = backup.value;

    const data = [];
    for (let x = topLeftX; x <= bottomRightX; x++) {
        for (let y = topLeftY; y <= bottomRightY; y++) {
            if (! (topLeftY == y && topLeftX == x)) {
                data.push(obj.options.data[x][y]);
                updateCell.call(obj, y, x, '', true);
                obj.options.mergeCells[cellName][2].push(obj.records[x][y].element);
                obj.records[x][y].element.style.display = 'none';
                obj.records[x][y].element = obj.records[topLeftX][topLeftY].element;
                obj.records[x][y].element.setAttribute('data-merge-src', cellName);
            }
        }
    }

    if(dispatchEvent) updateSelection.call(obj, obj.records[topLeftX][topLeftY].element);

    if(reMarging) {
        obj.options.mergeCells[cellName][2] = prevEls;
        obj.options.saMergeCells[cellName][2] = prevBackup;
        topLeftCellValue = prevBackup.value;
    }

    if (mergeMode === 'combine') {
        obj.records[topLeftX][topLeftY].element.style.lineHeight = (obj.options.defaultRowHeight ?? 25) + "px";
        setStyle.call(obj, cellName, "lineHeight", (obj.options.defaultRowHeight ?? 25) + "px", true, true)
    }

    updateCell.call(obj, topLeftY, topLeftX, topLeftCellValue, true);

    if (! ignoreHistoryAndEvents) {
        console.log("History for SA_setMerge: cellName=",cellName, "rowspan=",rowspan, "colspan=" , colspan);
        setHistory.call(obj, {
            action: 'SA_setMerge',
            payload: {
                cellName,
                rowspan,
                colspan,
                mergeMode,
            }
        })

        if(dispatchEvent) {
            dispatch.call(obj, 'onmerge', obj, { [cellName]: [colspan, rowspan]});
        } 
    }
}

export const SA_removeMerge = function({
    cellName,
    keepOptions = false,
    ignoreHistoryAndEvents = false
}) {
    const obj = this;

    if (!(obj.options.mergeCells && obj.options.mergeCells[cellName])) {
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
    obj.records[x][y].element.removeAttribute('data-merge-src');
    const [colspan, rowspan, elements] = mergeCellsObj;

    let index = 0, rs, cs;
    const backup = saMergeCellsObj[2];
    const backupCellValues = backup.cellValues;
    const {mergeMode} = backup;
    const reMergePayloads = [];

    for (rs = 0; rs < rowspan; rs++) {
        for (cs = 0; cs < colspan; cs++) {
            if (rs > 0 || cs > 0) {
                obj.records[x+rs][y+cs].element = elements[index++];
                obj.records[x+rs][y+cs].element.style.display = '';
                obj.records[x+rs][y+cs].element.removeAttribute('data-merge-src');

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
                            reMarging: true,
                            mergeMode: bkp.mergeMode,
                        })
                    }
                }
            }
        }
    }

    for(const payload of reMergePayloads) {
        SA_setMerge.call(obj, payload);
    }

    updateCell.call(obj, y, x, backup.topLeftValue, true)
    updateSelection.call(obj, obj.records[x][y].element, obj.records[x+rs-1][y+cs-1].element);

    if (!ignoreHistoryAndEvents) {
        console.log("History for SA_removeMerge: cellName=",cellName, "rowspan=", rowspan, "colspan=" , colspan);

        setHistory.call(obj, {
            action: 'SA_removeMerge',
            payload: {
                cellName,
                rowspan,
                colspan,
                mergeMode,
            }
        })
    }
}
