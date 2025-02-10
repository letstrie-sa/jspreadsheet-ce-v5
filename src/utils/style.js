import dispatch from "./dispatch.js";
import { getColumnNameFromId, getIdFromColumnName } from "./internalHelpers.js";
import { setHistory } from "./history.js";

/**
 * Get style information from cell(s)
 *
 * @return integer
 */
export const getStyle = function (cell, key) {
  const obj = this;

  // Cell
  if (!cell) {
    if (!(obj.options.data && obj.options.data.length > 0)) {
      return {};
    }

    // Control vars
    const data = {};

    // Column and row length
    const x = obj.options.data[0].length;
    const y = obj.options.data.length;

    // Go through the columns to get the data
    for (let j = 0; j < y; j++) {
      for (let i = 0; i < x; i++) {
        // Value
        const v = key
          ? obj.records[j][i].element.style[key]
          : obj.records[j][i].element.getAttribute("style");

        // Any meta data for this column?
        if (v) {
          // Column name
          const k = getColumnNameFromId([i, j]);
          // Value
          data[k] = v;
        }
      }
    }

    return data;
  } else {
    cell = getIdFromColumnName(cell, true);

    return key
      ? obj.records[cell[1]][cell[0]].element.style[key]
      : obj.records[cell[1]][cell[0]].element.getAttribute("style");
  }
};

function isFalsyOrEmpty(value) {
  if (!value) return true; // Covers falsy values: false, 0, "", null, undefined, NaN
  if (typeof value === "object" && Object.keys(value).length === 0) return true; // Empty object check
  return false;
}

/**
 * Set meta information to cell(s)
 *
 * @return integer
 */
export const setStyle = function (
  cell,
  _property,
  _value,
  force,
  ignoreHistoryAndEvents
) {
  console.log({
    cell,
    _property,
    _value,
    force,
    ignoreHistoryAndEvents,
  })

  const obj = this;

  const newValue = {};
  const oldValue = {};

  const applyStyle = function (
    cellname,
    key,
    value,
    partialImpDetected = false
  ) {
    const [y, x] = getIdFromColumnName(cellname, true);

    if (
      obj.records[x] &&
      obj.records[x][y] &&
      (obj.records[x][y].element.classList.contains("readonly") == false ||
        force)
    ) {
      const mergeSrc = obj.records[x][y].element.getAttribute("data-merge-src");
      if (
        typeof mergeSrc === "string" &&
        mergeSrc.length > 0 &&
        mergeSrc !== cellname
      ) {
        return;
      }

      // Current value
      const currentValue = obj.records[x][y].element.style[key];

      if (key === "text-decoration" && !!value) {
        const valuesSet = new Set(currentValue.split(" ").filter(Boolean));
        const newValuesSet = new Set(value.split(" ").filter(Boolean));

        for (const v of newValuesSet) {
          if (valuesSet.has(v)) {
            valuesSet.delete(v);
          } else {
            valuesSet.add(v);
          }
        }

        value = Array.from(valuesSet).join(" ");
      }

      if (force || partialImpDetected || currentValue != value) {
        obj.records[x][y].element.style[key] = value;
      } else {
        value = "";
        obj.records[x][y].element.style[key] = "";
      }

      // History
      if (!oldValue[cellname]) {
        oldValue[cellname] = [];
      }
      if (!newValue[cellname]) {
        newValue[cellname] = [];
      }

      console.log("currentValue: " + currentValue + ", newValue: " + value)

      oldValue[cellname].push([key + ":" + currentValue]);
      newValue[cellname].push([key + ":" + value]);
    }
  };

  if (_property && _value) {
    // Get object from string
    if (typeof cell == "string") {
      applyStyle(cell, _property, _value);
    }
  } else {
    const cssRuleBasedMap = {};
    const keys = Object.keys(cell);
    for (let i = 0; i < keys.length; i++) {
      const cellname = keys[i];

      const [y, x] = getIdFromColumnName(cellname, true);

      let cssRules = cell[cellname];
      if (typeof cssRules == "string") cssRules = cssRules.split(";");

      for (let j = 0; j < cssRules.length; j++) {
        if (typeof cssRules[j] == "string") {
          cssRules[j] = cssRules[j].split(":").map((e) => e.trim());
        }

        // Example ===> [fontWeight, bold]
        const [styleKey, styleValue] = cssRules[j];
        // if (styleKey) applyStyle(cellname, styleKey, styleValue);

        if (styleKey) {
          const currentValue = obj.records[x][y].element.style[styleKey];
          const curKey = `${styleKey}##${styleValue}`;
          if (!cssRuleBasedMap[curKey]) cssRuleBasedMap[curKey] = [];
          cssRuleBasedMap[curKey].push(cellname);
        }
      }
    }

    for (const kv in cssRuleBasedMap) {
      const [styleKey, styleValue] = kv.split("##");
      const cellnames = cssRuleBasedMap[kv];
      let partialImpDetected = false;
      for (const cname of cellnames) {
        const [y, x] = getIdFromColumnName(cname, true);
        if (obj.records[x] && obj.records[x][y]) {
          const currentValue = obj.records[x][y].element.style[styleKey];
          if (currentValue != styleValue) {
            partialImpDetected = true;
            break;
          }
        }
      }
      for (const cname of cellnames)
        applyStyle(cname, styleKey, styleValue, partialImpDetected);
    }
  }

  let keys = Object.keys(oldValue);
  for (let i = 0; i < keys.length; i++) {
    oldValue[keys[i]] = oldValue[keys[i]].join(";");
  }
  keys = Object.keys(newValue);
  for (let i = 0; i < keys.length; i++) {
    newValue[keys[i]] = newValue[keys[i]].join(";");
  }

  if (
    !ignoreHistoryAndEvents &&
    !(isFalsyOrEmpty(oldValue) && isFalsyOrEmpty(newValue))
  ) {
    setHistory.call(obj, {
      action: "setStyle",
      oldValue: oldValue,
      newValue: newValue,
    });

    console.log({
      oldValue: oldValue,
      newValue: newValue,
    });

    dispatch.call(obj, "onchangestyle", obj, newValue);
  }
};

export const resetStyle = function (o, ignoreHistoryAndEvents) {
  const obj = this;

  const keys = Object.keys(o);
  for (let i = 0; i < keys.length; i++) {
    // Position
    const cell = getIdFromColumnName(keys[i], true);
    if (obj.records[cell[1]] && obj.records[cell[1]][cell[0]]) {
      obj.records[cell[1]][cell[0]].element.setAttribute("style", "");
    }
  }
  obj.setStyle(o, null, null, null, ignoreHistoryAndEvents);
};
