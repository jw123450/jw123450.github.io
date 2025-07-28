// /*globals $, JS9 */
// (function () {
//   "use strict";

//   let savedRegions = [];

//   const toolbarHTML = `
//     <div style="float:right; margin:10px">
//       <button class="save_regions_button">Save Apertures</button>
//       <button class="load_regions_button" style="margin-left:10px;">Load Apertures</button>
//     </div>
//   `;

//   function updateStatus(msg) {
//     this.outerdivjq.find("#statusMessage").text(msg);
//   }

//   function bindButtons() {
//     const $outer = this.outerdivjq;

//     // Save Regions
//     $outer.find(".save_regions_button").off("click").on("click", () => {
//       const display = this.display || JS9.GetDisplay();
//       if (!display) {
//         updateStatus.call(this, "No display found.");
//         return;
//       }

//       const regions = JS9.GetRegions("all", { format: "object", display });
//       if (!regions || regions.length === 0) {
//         updateStatus.call(this, "No regions to save.");
//         return;
//       }

//       savedRegions = regions.map(r => ({ ...r })); // deep copy
//       updateStatus.call(this, `Saved ${savedRegions.length} apertures(s).`);
//     });

//     // Load Regions
//     $outer.find(".load_regions_button").off("click").on("click", () => {
//       const display = this.display || JS9.GetDisplay();
//       if (!display) {
//         updateStatus.call(this, "No display found.");
//         return;
//       }

//       if (!savedRegions || savedRegions.length === 0) {
//         updateStatus.call(this, "No saved apertures to load.");
//         return;
//       }

//       savedRegions.forEach(r => {
//         const regCopy = { ...r };
//         delete regCopy.id;
//         delete regCopy.mode;
//         delete regCopy.imstr;
//         delete regCopy.wcsstr;
//         delete regCopy.lcs;
//         delete regCopy.parent;
//         delete regCopy.child;
//         JS9.AddRegions(regCopy, { display });
//       });

//       updateStatus.call(this, `Loaded ${savedRegions.length} apertures(s).`);
//     });
//   }

//   function initPlugin() {
//     const container = $(this.div)
//       .css({ resize: "both", overflow: "auto" })
//       .empty();

//     const messageDiv = $("<div style='padding:10px;'>Use Save/Load to persist apertures across images.</div>");
//     const statusDiv = $("<div id='statusMessage' style='padding: 5px 10px; color: #444; font-weight: bold;'></div>");
//     const saveDiv = $("<div style='padding:10px;'>Save apertures to file</div>");
//     const loadDiv = $("<div style='padding:10px;'>Load apertures from file</div>");

//     container.append(messageDiv);
//     container.append(statusDiv);
//     container.append(saveDiv);
//     container.append(loadDiv);

//     bindButtons.call(this);
//   }

//   JS9.RegisterPlugin("JW", "RegionManager", initPlugin, {
//     menu: "Analysis",
//     menuItem: " Save/Load Apertures",
//     winTitle: "Save/Load",
//     toolbarSeparate: true,
//     toolbarHTML: toolbarHTML,
//     winDims: [360, 120],
//     onregionschange: bindButtons,
//     onnewimage: bindButtons
//   });
// })();

















/*globals $, JS9 */
(function () {
  "use strict";

  let savedRegions = [];

  const toolbarHTML = `
    <div style="float:right; margin:10px">
      <button class="save_regions_button">Save Apertures</button>
      <button class="load_regions_button" style="margin-left:10px;">Load Apertures</button>
    </div>
  `;

  function updateStatus(msg) {
    this.outerdivjq.find("#statusMessage").text(msg);
  }

  function bindButtons() {
    const $outer = this.outerdivjq;

    // Save Regions (in-memory)
    $outer.find(".save_regions_button").off("click").on("click", () => {
      const display = this.display || JS9.GetDisplay();
      if (!display) {
        updateStatus.call(this, "No display found.");
        return;
      }

      const regions = JS9.GetRegions("all", { format: "object", display });
      if (!regions || regions.length === 0) {
        updateStatus.call(this, "No regions to save.");
        return;
      }

      savedRegions = regions.map(r => ({ ...r })); // deep copy
      updateStatus.call(this, `Saved ${savedRegions.length} apertures(s).`);
    });

    // Load Regions (from memory)
    $outer.find(".load_regions_button").off("click").on("click", () => {
      const display = this.display || JS9.GetDisplay();
      if (!display) {
        updateStatus.call(this, "No display found.");
        return;
      }

      if (!savedRegions || savedRegions.length === 0) {
        updateStatus.call(this, "No saved apertures to load.");
        return;
      }

      savedRegions.forEach(r => {
        const regCopy = { ...r };
        delete regCopy.id;
        delete regCopy.mode;
        delete regCopy.imstr;
        delete regCopy.wcsstr;
        delete regCopy.lcs;
        delete regCopy.parent;
        delete regCopy.child;
        JS9.AddRegions(regCopy, { display });
      });

      updateStatus.call(this, `Loaded ${savedRegions.length} apertures(s).`);
    });

    // Save to file
    $outer.find(".save_to_file_button").off("click").on("click", () => {
      const display = this.display || JS9.GetDisplay();
      JS9.SaveRegions("savedApertures.txt", { display });
      updateStatus.call(this, "Saved apertures to 'savedApertures.txt'");
    });

  //   // Load from file
  //   $outer.find(".load_from_file_button").off("click").on("click", () => {
  //     const display = this.display || JS9.GetDisplay();
  //     JS9.LoadRegions("savedApertures.txt", { display });
  //     updateStatus.call(this, "Loaded apertures from 'savedApertures.txt'");
  //   });
  // }


    // Only add file input once
    if (!$outer.find("#js9-load-local-file").length) {
      const $fileInput = $("<input type='file' id='js9-load-local-file' accept='.txt,.reg' style='display:none;'>");
      $outer.append($fileInput);

      $fileInput.on("change", (evt) => {
        const file = evt.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const regionData = e.target.result;
          const display = this.display || JS9.GetDisplay();

          JS9.LoadRegions(regionData, { display, on: "data" });

          if (typeof updateStatus === "function") {
            updateStatus.call(this, `Loaded apertures from file: ${file.name}`);
          } else {
            console.log(`Loaded apertures from file: ${file.name}`);
          }
        };
        reader.readAsText(file);
      });
    }

    // Re-bind load button to open the file chooser
    $outer.find(".load_from_file_button").off("click").on("click", () => {
      $outer.find("#js9-load-local-file").trigger("click");
    });






  function initPlugin() {
    const container = $(this.div)
      .css({ resize: "both", overflow: "auto" })
      .empty();

    const messageDiv = $("<div style='padding:10px;'>Use Save/Load to persist apertures across images.</div>");
    const statusDiv = $("<div id='statusMessage' style='padding: 5px 10px; color: #444; font-weight: bold;'></div>");

    // Button row for file-based save/load
    const fileDiv = $("<div style='padding:10px; display:flex; gap:10px; align-items:center;'></div>");
    const saveFileButton = $("<button class='save_to_file_button'>Save to File</button>");
    const loadFileButton = $("<button class='load_from_file_button'>Load from File</button>");
    fileDiv.append(saveFileButton, loadFileButton);

    container.append(messageDiv);
    container.append(statusDiv);
    container.append(fileDiv);

    bindButtons.call(this);
  }

  JS9.RegisterPlugin("JW", "RegionManager", initPlugin, {
    menu: "Analysis",
    menuItem: " Save/Load Apertures",
    winTitle: "Save/Load",
    toolbarSeparate: true,
    toolbarHTML: toolbarHTML,
    winDims: [360, 140],
    onregionschange: bindButtons,
    onnewimage: bindButtons
  });
})();
