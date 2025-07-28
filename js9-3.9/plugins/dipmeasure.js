/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9 */

(function () {
    "use strict";

    const imexam = require("./imexam");
    const projToolbar = `
        <div style='float:right; margin:10px'>
            <select class='proj_menu JS9Select'>
                <option>avg</option>
                <option>sum</option>
                <option>med</option>
            </select>
            <button class='measure_dip_button' style='margin-left:10px;'>Measure Dip</button>
            <button class='export_dip_button' style='margin-left:10px;'>Export</button>
        </div>
    `;

    let dipPoints = [];
    let plotData = [];
    let plotRef = null;
    let exportCount = 1;
    let currentRegion = null;
    let currentRegionInfo = null; 
    let currentImage = null;
    let lastDipWidth = null;

    function drawPlot(plotdiv, data, markings = []) {
        plotRef = $.plot(plotdiv, [data], {
            zoomStack: true,
            selection: { mode: "xy" },
            grid: {
                clickable: true,
                markings: markings
            }
        });
    }

    function projUpdate(im, xreg) {
        let wrapper, plotdiv, proj, menx;

        if (im === undefined) {
            wrapper = xreg.wrapper;
            plotdiv = xreg.plotdiv;
            proj = xreg.proj;
            menx = xreg.menu;
            // NO change here
        } else {
            wrapper = this.div;
            menx = this.outerdivjq.find(".proj_menu")[0];
            plotdiv = this.outerdivjq.find(".dip-plot")[0];
            currentImage = im;

            // Store both projection data and region info
            currentRegionInfo = xreg;  
            currentRegion = imexam.getRegionData(im, xreg);
            proj = imexam.ndops.proj(currentRegion, this.plugin.opts.xyproj);

            $(menx).off("change").on("change", () => {
                projUpdate.call(this, undefined, {
                    wrapper: wrapper,
                    plotdiv: plotdiv,
                    proj: proj,
                    menu: menx
                });
            });
        }

        const resultBox = this.outerdivjq.find("#dipResult");
        const instructions = this.outerdivjq.find("#dipInstructions");
        instructions.hide();

        $(plotdiv).empty();

        const projType = menx.options[menx.selectedIndex].value;
        const data = proj[projType];
        plotData = data.map((val, i) => [i, val]);

        drawPlot(plotdiv, plotData);

        $(".measure_dip_button").off("click").on("click", () => {
            dipPoints = [];
            lastDipWidth = null;
            resultBox.text("Click two points on the graph to measure dip width.");

            $(plotdiv).off("plotclick").on("plotclick", (event, pos) => {
                if (pos?.x !== undefined) {
                    dipPoints.push(pos.x);
                    if (dipPoints.length === 2) {
                        lastDipWidth = Math.abs(dipPoints[1] - dipPoints[0]);
                        resultBox.html(`Dip width: <strong>${lastDipWidth.toFixed(2)} pixels</strong>`);

                        const x1 = dipPoints[0];
                        const x2 = dipPoints[1];
                        const markings = [
                            { color: "black", lineWidth: 1, xaxis: { from: x1, to: x1 } },
                            { color: "black", lineWidth: 1, xaxis: { from: x2, to: x2 } }
                        ];

                        drawPlot(plotdiv, plotData, markings);
                    }
                }
            });
        });


        $(".export_dip_button").off("click").on("click", () => {
          if (!currentImage || plotData.length === 0) {
            alert("No data to export. Generate the projection first.");
            return;
          }

          // First try region from onchange callback
          let region = currentRegionInfo;
          
          // Fallback to GetRegions if that failed
          if (!region || region.x == null) {
            const regs = JS9.GetRegions({ display: currentImage, format: "object" });
            if (!regs || regs.length === 0) {
              alert("No region found. Please create and finalize a region first.");
              return;
            }
            region = regs[0];
          }

          const x = region.x ?? region.xc ?? 0; //region.ra
          const y = region.y ?? region.yc ?? 0; //region.dec

          let width = 0, height = 0;
          if (region.width != null && region.height != null) {
            width = region.width;
            height = region.height;
          } else if (region.r1 != null && region.r2 != null) {
            width = 2 * region.r1;
            height = 2 * region.r2;
          } else if (region.r != null) {
            width = height = 2 * region.r;
          } else if (region.radius != null) {
            width = height = 2 * region.radius;
          }

          const adjustedX = x - 0.5 * width;

          let coordsStr;
          try {
            const wcs = currentImage.raw.wcs;
            if (wcs?.pix2wcs) {
              const [ra, dec] = wcs.pix2wcs(adjustedX, y);
              coordsStr = `x=${ra.toFixed(6)}?, y=${dec.toFixed(6)}?`;
            } else {
              coordsStr = `x=${adjustedX.toFixed(2)}, y=${y.toFixed(2)}`;
            }
          } catch {
            coordsStr = `x=${adjustedX.toFixed(2)}, y=${y.toFixed(2)}`;
          }
          coordsStr = '# Aperture left position: ' + coordsStr

          if (lastDipWidth != null) {
            coordsStr += `, dip width: ${lastDipWidth.toFixed(2)} pixels`;
          }

          let csvContent = coordsStr + "\npixel,value\n";
          plotData.forEach(([px, val]) => {
            csvContent += `${px},${val}\n`;
          });

          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `star${exportCount}.csv`;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          exportCount++;
        });

    }

    function projInit() {
        imexam.fixupDiv(this);

        const outer = $(this.div).css({ resize: "both", overflow: "auto" });
        const wrapper = $("<div class='dip-wrapper'></div>").css({ padding: "10px" });
        const instructions = $("<div id='dipInstructions' style='padding: 10px 0; color: #444;'>Create, click, move, or resize a region to see projection.<br>Then click 'Measure Dip' and select 2 points on the graph.</div>");
        const resultBox = $("<div id='dipResult' style='padding:5px 0; font-weight:bold; color:black; background:#f0f0f0; border-radius:4px;'></div>");
        const plotdiv = $("<div class='dip-plot' style='width:100%; height:200px;'></div>");
        const copyRegionReminder = $("<div id ='regionReminder' style='padding: 10px 0; color: $444;'>Use 'r' to copy a region and 'p' to paste it.</div>"); //Use 'r' to copy a region and 'p' to paste it.

        wrapper.append(instructions);
        wrapper.append(resultBox);
        wrapper.append(plotdiv);
        wrapper.append(copyRegionReminder);
        outer.empty().append(wrapper);
    }

    JS9.RegisterPlugin("JW", "MeasureDip", projInit, {
        menu: "Analysis",
        menuItem: " Measure Dip",
        winTitle: "Measure Dip",
        help: "imexam/imexam.html#xyproj",
        dynamicSelect: true,
        toolbarSeparate: true,
        toolbarHTML: projToolbar,
        onregionschange: projUpdate,
        winDims: [400, 300],
        xyproj: 0
    });
})();
