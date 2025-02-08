import jSuites from "jsuites";
import { getCellNameFromCoords } from "./helpers.js";
import { getWorksheetInstance } from "./internal.js";
import { SA_PROMPT } from "./prompts.js";
import { getMerge } from "./merges.js";

const setItemStatus = function (toolbarItem, worksheet) {
  if (worksheet.options.editable != false) {
    toolbarItem.classList.remove("jtoolbar-disabled");
  } else {
    toolbarItem.classList.add("jtoolbar-disabled");
  }
};

const getSelectedCells = (worksheet) => {
  const selectedCells = worksheet.selectedContainer;
  if (selectedCells?.length !== 4) {
    throw new Error("Invalid selected cells");
  }

  const [topLeftY, topLeftX, bottomRightY, bottomRightX] = selectedCells;

  const cells = [];
  for (let x = topLeftX; x <= bottomRightX; x++) {
    for (let y = topLeftY; y <= bottomRightY; y++) {
      const name = getCellNameFromCoords(y, x);
      cells.push(name);
    }
  }

  return cells;
};

export const getDefault = function () {
  const items = [];
  const spreadsheet = this;

  const getActive = function () {
    return getWorksheetInstance.call(spreadsheet);
  };

  const updateStyleOnSelectedCells = (key, value) => {
    const worksheet = getActive();
    const cells = getSelectedCells(worksheet);

    if (!cells) return;

    worksheet.setStyle(
      Object.fromEntries(
        cells.map(function (cellName) {
          return [cellName, key + ":" + value];
        })
      )
    );
  };

  // Undo
  items.push({
    content: "undo",
    onclick: function () {
      const worksheet = getActive();

      worksheet.undo();
    },
  });

  // Redo
  items.push({
    content: "redo",
    onclick: function () {
      const worksheet = getActive();

      worksheet.redo();
    },
  });

  // Divider
  items.push({
    type: "divisor",
  });

  // Bold Text
  items.push({
    content: "format_bold",
    onclick: function (a, b, c) {
      updateStyleOnSelectedCells("font-weight", "bold");
    },
    updateState: function (a, b, toolbarItem) {
      setItemStatus(toolbarItem, getActive());
    },
  });

  // Italic Text
  items.push({
    content: "format_italic",
    onclick: function (a, b, c) {
      updateStyleOnSelectedCells("font-style", "italic");
    },
    updateState: function (a, b, toolbarItem) {
      setItemStatus(toolbarItem, getActive());
    },
  });

  // Italic Text
  items.push({
    content: "format_underlined",
    onclick: function (a, b, c) {
      updateStyleOnSelectedCells("text-decoration", "underline");
    },
    updateState: function (a, b, toolbarItem) {
      setItemStatus(toolbarItem, getActive());
    },
  });

  // Italic Text
  items.push({
    content: "format_strikethrough",
    onclick: function (a, b, c) {
      updateStyleOnSelectedCells("text-decoration", "line-through");
    },
    updateState: function (a, b, toolbarItem) {
      setItemStatus(toolbarItem, getActive());
    },
  });

  // Divider
  items.push({
    type: "divisor",
  });

  // Horizontal Alignment
  items.push({
    type: "select",
    options: ["left", "center", "right", "justify"],
    render: function (e) {
      return '<i class="material-icons">format_align_' + e + "</i>";
    },
    onchange: function (a, b, c, value) {
      updateStyleOnSelectedCells("text-align", value);
    },
    updateState: function (a, b, toolbarItem) {
      setItemStatus(toolbarItem, getActive());
    },
  });

  // Vertical Alignment
  items.push({
    type: "select",
    options: [
      "vertical_align_top",
      "vertical_align_center",
      "vertical_align_bottom",
    ],
    render: function (e) {
      return '<i class="material-icons">' + e + "</i>";
    },
    value: 1,
    onchange: function (a, b, c, d, value) {
      let verticalAlign = ["top", "middle", "bottom"];
      updateStyleOnSelectedCells("vertical-align", verticalAlign[value]);
    },
    updateState: function (a, b, toolbarItem) {
      setItemStatus(toolbarItem, getActive());
    },
  });

  // Divider
  items.push({
    type: "divisor",
  });

  // Merge
  items.push({
    content: "web",
    tooltip: jSuites.translate("Merge the selected cells"),
    onclick: async function () {
      const worksheet = getActive();

      const selectedCells = worksheet.selectedContainer;
      if (selectedCells?.length !== 4) {
        throw new Error("Invalid selected cells");
      }

      const [topLeftY, topLeftX, bottomRightY, bottomRightX] = selectedCells;

      let cellName = getCellNameFromCoords(topLeftY, topLeftX); // Like: B22, C1, B5

      let colspan = bottomRightY - topLeftY + 1;
      let rowspan = bottomRightX - topLeftX + 1;

      const mergedInfo = getMerge.call(worksheet, cellName);
      if (mergedInfo) {
        return worksheet.SA_removeMerge({ cellName });
      }

      if (colspan !== 1 || rowspan !== 1) {
        const response = await SA_PROMPT(
          "Select how you want to merge the selected cells. You can choose to keep only the top-left value, combine all data, or cancel the operation.",
          [
            {
              id: "top-left",
              text: "Top-Left",
              type: "primary",
              onclick: () => console.log("Top-Left Value Selected"),
            },
            {
              id: "combine",
              text: "All Data",
              type: "secondary",
              onclick: () => console.log("All Data Combined"),
            },
            {
              id: "close",
              text: "Cancel",
              type: "danger",
              onclick: () => console.log("Operation Cancelled"),
            },
          ]
        );

        if (response.id === "close") return;

        worksheet.SA_setMerge({
          cellName,
          rowspan,
          colspan,
          mergeMode: response.id,
        });
      }
    },
    updateState: function (a, b, toolbarItem) {
      setItemStatus(toolbarItem, getActive());
    },
  });

  // items.push({
  //     content: 'fullscreen',
  //     tooltip: 'Toggle Fullscreen',
  //     onclick: function(a,b,c) {
  //         if (c.children[0].textContent === 'fullscreen') {
  //             spreadsheet.fullscreen(true);
  //             c.children[0].textContent = 'fullscreen_exit';
  //         } else {
  //             spreadsheet.fullscreen(false);
  //             c.children[0].textContent = 'fullscreen';
  //         }
  //     },
  //     updateState: function(a,b,c,d) {
  //         if (d.parent.config.fullscreen === true) {
  //             c.children[0].textContent = 'fullscreen_exit';
  //         } else {
  //             c.children[0].textContent = 'fullscreen';
  //         }
  //     }
  // });

  // items.push({
  //     content: 'save',
  //     onclick: function () {
  //         const worksheet = getActive();

  //         if (worksheet) {
  //             worksheet.download();
  //         }
  //     }
  // });

  // items.push({
  //     type:'divisor',
  // });

  // items.push({
  //     type:'select',
  //     width: '120px',
  //     options: [ 'Default', 'Verdana', 'Arial', 'Courier New' ],
  //     render: function(e) {
  //         return '<span style="font-family:' + e + '">' + e + '</span>';
  //     },
  //     onchange: function(a,b,c,d,e) {
  //         const worksheet = getActive();

  //         let cells = worksheet.getSelected(true);
  //         if (cells) {
  //             let value = (! e) ? '' : d;

  //             worksheet.setStyle(Object.fromEntries(cells.map(function(cellName) {
  //                 return [cellName, 'font-family: ' + value ];
  //             })));
  //         }
  //     },
  //     updateState: function(a, b, toolbarItem) {
  //         setItemStatus(toolbarItem, getActive());
  //     }
  // });

  // items.push({
  //     type: 'select',
  //     width: '48px',
  //     content: 'format_size',
  //     options: ['x-small','small','medium','large','x-large'],
  //     render: function(e) {
  //         return '<span style="font-size:' + e + '">' + e + '</span>';
  //     },
  //     onchange: function(a, b, c, value) {
  //         const worksheet = getActive();

  //         let cells = worksheet.getSelected(true);
  //         if (cells) {
  //             worksheet.setStyle(Object.fromEntries(cells.map(function(cellName) {
  //                 return [cellName, 'font-size: ' + value ];
  //             })));
  //         }
  //     },
  //     updateState: function(a, b, toolbarItem) {
  //         setItemStatus(toolbarItem, getActive());
  //     }
  // });

  // items.push({
  //     type: 'color',
  //     content: 'format_color_text',
  //     k: 'color',
  //     updateState: function(a, b, toolbarItem) {
  //         setItemStatus(toolbarItem, getActive());
  //     }
  // });

  // items.push({
  //     type: 'color',
  //     content: 'format_color_fill',
  //     k: 'background-color',
  //     updateState: function(a, b, toolbarItem, d) {
  //         setItemStatus(toolbarItem, getActive());
  //     }
  // });

  // items.push({
  //     type: 'select',
  //     options: [ 'border_all', 'border_outer', 'border_inner', 'border_horizontal', 'border_vertical', 'border_left', 'border_top', 'border_right', 'border_bottom', 'border_clear' ],
  //     columns: 5,
  //     render: function(e) {
  //         return '<i class="material-icons">' + e + '</i>';
  //     },
  //     right: true,
  //     onchange: function(a,b,c,d) {
  //         const worksheet = getActive();

  //         if (worksheet.selectedCell) {
  //             const selectedRange = [
  //                 Math.min(worksheet.selectedCell[0], worksheet.selectedCell[2]),
  //                 Math.min(worksheet.selectedCell[1], worksheet.selectedCell[3]),
  //                 Math.max(worksheet.selectedCell[0], worksheet.selectedCell[2]),
  //                 Math.max(worksheet.selectedCell[1], worksheet.selectedCell[3]),
  //             ];

  //             let type = d;

  //             if (selectedRange) {
  //                 // Default options
  //                 let thickness = b.thickness || 1;
  //                 let color = b.color || 'black';
  //                 const borderStyle = b.style || 'solid';

  //                 if (borderStyle === 'double') {
  //                     thickness += 2;
  //                 }

  //                 let style = {};

  //                 // Matrix
  //                 let px = selectedRange[0];
  //                 let py = selectedRange[1];
  //                 let ux = selectedRange[2];
  //                 let uy = selectedRange[3];

  //                 const setBorder = function(columnName, i, j) {
  //                     let border = [ '','','','' ];

  //                     if (((type === 'border_top' || type === 'border_outer') && j === py) ||
  //                         ((type === 'border_inner' || type === 'border_horizontal') && j > py) ||
  //                         (type === 'border_all')) {
  //                         border[0] = 'border-top: ' + thickness + 'px ' + borderStyle + ' ' + color;
  //                     } else {
  //                         border[0] = 'border-top: ';
  //                     }

  //                     if ((type === 'border_all' || type === 'border_right' || type === 'border_outer') && i === ux) {
  //                         border[1] = 'border-right: ' + thickness + 'px ' + borderStyle + ' ' + color;
  //                     } else {
  //                         border[1] = 'border-right: ';
  //                     }

  //                     if ((type === 'border_all' || type === 'border_bottom' || type === 'border_outer') && j === uy) {
  //                         border[2] = 'border-bottom: ' + thickness + 'px ' + borderStyle + ' ' + color;
  //                     } else {
  //                         border[2] = 'border-bottom: ';
  //                     }

  //                     if (((type === 'border_left' || type === 'border_outer') && i === px) ||
  //                         ((type === 'border_inner' || type === 'border_vertical') && i > px) ||
  //                         (type === 'border_all')) {
  //                         border[3] = 'border-left: ' + thickness + 'px ' + borderStyle + ' ' + color;
  //                     } else {
  //                         border[3] = 'border-left: ';
  //                     }

  //                     style[columnName] = border.join(';');
  //                 }

  //                 for (let j = selectedRange[1]; j <= selectedRange[3]; j++) { // Row - py - uy
  //                     for (let i = selectedRange[0]; i <= selectedRange[2]; i++) { // Col - px - ux
  //                         setBorder(getCellNameFromCoords(i, j), i, j);

  //                         if (worksheet.records[j][i].element.getAttribute('data-merged')) {
  //                             setBorder(
  //                                 getCellNameFromCoords(
  //                                     selectedRange[0],
  //                                     selectedRange[1],
  //                                 ),
  //                                 i,
  //                                 j
  //                             );
  //                         }
  //                     }
  //                 }

  //                 if (Object.keys(style)) {
  //                     worksheet.setStyle(style);
  //                 }
  //             }
  //         }
  //     },
  //     onload: function(a, b) {
  //         // Border color
  //         let container = document.createElement('div');
  //         let div = document.createElement('div');
  //         container.appendChild(div);

  //         let colorPicker = jSuites.color(div, {
  //             closeOnChange: false,
  //             onchange: function(o, v) {
  //                 o.parentNode.children[1].style.color = v;
  //                 b.color = v;
  //             },
  //         });

  //         let i = document.createElement('i');
  //         i.classList.add('material-icons');
  //         i.innerHTML = 'color_lens';
  //         i.onclick = function() {
  //             colorPicker.open();
  //         }
  //         container.appendChild(i);
  //         a.children[1].appendChild(container);

  //         div = document.createElement('div');
  //         jSuites.picker(div, {
  //             type: 'select',
  //             data: [ 1, 2, 3, 4, 5 ],
  //             render: function(e) {
  //                 return '<div style="height: ' + e + 'px; width: 30px; background-color: black;"></div>';
  //             },
  //             onchange: function(a, k, c, d) {
  //                 b.thickness = d;
  //             },
  //             width: '50px',
  //         });
  //         a.children[1].appendChild(div);

  //         const borderStylePicker = document.createElement('div');
  //         jSuites.picker(borderStylePicker, {
  //             type: 'select',
  //             data: ['solid', 'dotted', 'dashed', 'double'],
  //             render: function(e) {
  //                 if (e === 'double') {
  //                     return '<div style="width: 30px; border-top: 3px ' + e + ' black;"></div>';
  //                 }
  //                 return '<div style="width: 30px; border-top: 2px ' + e + ' black;"></div>';
  //             },
  //             onchange: function(a, k, c, d) {
  //                 b.style = d;
  //             },
  //             width: '50px',
  //         });
  //         a.children[1].appendChild(borderStylePicker);

  //         div = document.createElement('div');
  //         div.style.flex = '1'
  //         a.children[1].appendChild(div);
  //     },
  //     updateState: function(a, b, toolbarItem) {
  //         setItemStatus(toolbarItem, getActive());
  //     }
  // });

  return items;
};

const adjustToolbarSettingsForJSuites = function (toolbar) {
  const spreadsheet = this;

  const items = toolbar.items;

  for (let i = 0; i < items.length; i++) {
    // Tooltip
    if (items[i].tooltip) {
      items[i].title = items[i].tooltip;

      delete items[i].tooltip;
    }

    if (items[i].type == "select") {
      if (items[i].options) {
        items[i].data = items[i].options;
        delete items[i].options;
      } else {
        items[i].data = items[i].v;
        delete items[i].v;

        if (items[i].k && !items[i].onchange) {
          items[i].onchange = function (el, config, value) {
            const worksheet = getWorksheetInstance.call(spreadsheet);

            const cells = worksheet.getSelected(true);

            worksheet.setStyle(
              Object.fromEntries(
                cells.map(function (cellName) {
                  return [cellName, items[i].k + ": " + value];
                })
              )
            );
          };
        }
      }
    } else if (items[i].type == "color") {
      items[i].type = "i";

      items[i].onclick = function (a, b, c) {
        if (!c.color) {
          jSuites.color(c, {
            onchange: function (o, v) {
              const worksheet = getWorksheetInstance.call(spreadsheet);

              const cells = worksheet.getSelected(true);

              worksheet.setStyle(
                Object.fromEntries(
                  cells.map(function (cellName) {
                    return [cellName, items[i].k + ": " + v];
                  })
                )
              );
            },
            onopen: function (o) {
              o.color.select("");
            },
          });

          c.color.open();
        }
      };
    }
  }
};

/**
 * Create toolbar
 */
export const createToolbar = function (toolbar) {
  const spreadsheet = this;

  const toolbarElement = document.createElement("div");
  toolbarElement.classList.add("jss_toolbar");

  adjustToolbarSettingsForJSuites.call(spreadsheet, toolbar);

  if (typeof spreadsheet.plugins === "object") {
    Object.entries(spreadsheet.plugins).forEach(function ([, plugin]) {
      if (typeof plugin.toolbar === "function") {
        const result = plugin.toolbar(toolbar);

        if (result) {
          toolbar = result;
        }
      }
    });
  }

  jSuites.toolbar(toolbarElement, toolbar);

  return toolbarElement;
};

export const updateToolbar = function (worksheet) {
  if (worksheet.parent.toolbar) {
    worksheet.parent.toolbar.toolbar.update(worksheet);
  }
};

export const showToolbar = function () {
  const spreadsheet = this;

  if (spreadsheet.config.toolbar && !spreadsheet.toolbar) {
    let toolbar;

    if (Array.isArray(spreadsheet.config.toolbar)) {
      toolbar = {
        items: spreadsheet.config.toolbar,
      };
    } else if (typeof spreadsheet.config.toolbar === "object") {
      toolbar = spreadsheet.config.toolbar;
    } else {
      toolbar = {
        items: getDefault.call(spreadsheet),
      };

      if (typeof spreadsheet.config.toolbar === "function") {
        toolbar = spreadsheet.config.toolbar(toolbar);
      }
    }

    spreadsheet.toolbar = spreadsheet.element.insertBefore(
      createToolbar.call(spreadsheet, toolbar),
      spreadsheet.element.children[1]
    );
  }
};

export const hideToolbar = function () {
  const spreadsheet = this;

  if (spreadsheet.toolbar) {
    spreadsheet.toolbar.parentNode.removeChild(spreadsheet.toolbar);

    delete spreadsheet.toolbar;
  }
};
