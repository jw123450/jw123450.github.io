/*jslint white: true, vars: true, plusplus: true, nomen: true, unparam: true */
/*globals $, JS9, require */

"use strict";

(function () {
    const imexam = require("./imexam");

    const toolbarHTML = `
        <div style='float:right; margin:10px'>
            <button class='export_stats_button' style='margin-left:10px;'>Export</button>
        </div>
    `;

    const statTemplate = `
        <table width=100% style='padding-right: 6px; padding-left: 0px'>
            <tr><td align=right>position x</td> <td align=right>{reg.x%.2f}</td>
                <td align=right>y</td> <td align=right>{reg.y%.2f}</td></tr>
            <tr><td align=right>box width</td> <td align=right>{reg.width%.2f}</td>
                <td align=right>height</td> <td align=right>{reg.height%.2f}</td></tr>
            <tr><td align=right>min</td> <td align=right>{min%.2f}</td>
                <td align=right>max</td> <td align=right>{max%.2f}</td></tr>
            <tr><td align=right>totcounts</td> <td align=right colspan=3>{totcnts.sum%.2f}</td></tr>
            <tr><td align=right>bscounts</td> <td align=right colspan=3>{bscnts.sum%.2f}</td></tr>
            <tr><td align=right>bkgd</td> <td align=right>{bkgd.value%.2f}</td>
                <td align=right>noise</td> <td align=right>{bkgd.noise%.2f}</td></tr>
            <tr><td align=right>centroid x</td> <td align=right>{bscnts.cenx%.2f}</td>
                <td align=right>y</td> <td align=right>{bscnts.ceny%.2f}</td></tr>
            <tr><td align=right>FWHM</td> <td align=right>{bscnts.fwhm%.2f}</td>
                <td align=right></td> <td align=right>{bscnts.rms%.2f}</td></tr>
        </table>`;

    function regionStats(im, xreg) {
        if (!im || !xreg) return null;

        const section = imexam.reg2section(xreg);
        const imag = imexam.getRegionData(im, xreg);
        if (!imag) return null;

        const data = imexam.ndops.assign(imexam.ndops.zeros(imag.shape), imag);
        const data2 = imexam.ndops.assign(imexam.ndops.zeros(imag.shape), imag);

        const stats = {
            reg: xreg,
            min: imexam.ndops.minvalue(imag),
            max: imexam.ndops.maxvalue(imag),
            bkgd: imexam.imops.backgr(imag, 4)
        };

        imexam.ndops.subs(data, imag, stats.bkgd.value);
        stats.bscnts = imexam.ndops.centroid(data, imexam.ndops.qcenter(data));
        stats.bscnts.cenx += section[0][0];
        stats.bscnts.ceny += section[1][0];

        stats.totcnts = imexam.ndops.centroid(data2, imexam.ndops.qcenter(data2));
        stats.totcnts.cenx += section[0][0];
        stats.totcnts.ceny += section[1][0];

        return stats;
    }

    function statUpdate(im, xreg) {
        if (!im || !xreg) return;

        const html = imexam.template(statTemplate, regionStats(im, xreg));
        $(this.div).html(html);

        $(".export_stats_button").off("click").on("click", () => {
        	const display = this.display || JS9.GetDisplay();
            if (!im) {
                alert("No image loaded.");
                return;
            }

            const regions = JS9.GetRegions("all", { format: "object", display });
            if (!regions || regions.length === 0) {
                alert("No regions found. Please create regions first.");
                return;
            }


            const fname = (im.file || "regionstats.fits")
                .replace(/\[.*?\]/, "")      // remove HDU tag
                .replace(/\.fits(\.fz)?$/i, "") // strip extension
                + "_phot.csv";


            let csv = "#" + [fname].join(",");
            csv += ',ra/x,dec/y,d,totcounts,bscounts,bkgnd,noise,centroidx,centroidy,FWHM' + "\n";

            let savename = -1;
            
            regions.forEach((reg, idx) => {

                const stats = regionStats(im, reg);
                if (!stats) return;
                let name = "";
                let test = idx - savename

                name = reg.text || `star${test}`;

                if (Array.isArray(reg.tags)) {
                    for (const tag of reg.tags) {
                        if (tag.toLowerCase().includes("asteroid")) {
                            name = tag;
                            savename = savename + 1;
                        }
                    }
                }

                const x = reg.ra ?? reg.x ?? reg.xc ?? 0;
                const y = reg.dec ?? reg.y ?? reg.yc ?? 0;

                let r1 = 0, r2 = 0;
                if (reg.annulus || reg.type === "annulus") {
                    if (Array.isArray(reg.points) && reg.points.length >= 4) {
                        r1 = reg.points[2];
                        //r2 = reg.points[3];
                    }
                } else {
                    r1 = reg.r1 ?? reg.radius ?? reg.width ?? 0;
                    //r2 = reg.r2 ?? reg.radius ?? reg.height ?? 0;
                }



                csv += [
                    name,
                    x,
                    y,
                    r1.toFixed(2),
                    stats.totcnts.sum.toFixed(2),
                    stats.bscnts.sum.toFixed(2),
                    stats.bkgd.value.toFixed(2),
                    stats.bkgd.noise.toFixed(2),
                    stats.bscnts.cenx.toFixed(2),
                    stats.bscnts.ceny.toFixed(2),
                    stats.bscnts.fwhm.toFixed(2)
                ].join(",") + "\n";
            });

            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fname;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });


    }

    function statInit() {
        imexam.fixupDiv(this);
        $(this.div).append("<p style='padding: 20px 0px 0px 20px; margin: 0px'>create, click, move, or resize a region to see stats<br>");
    }

    JS9.RegisterPlugin("JW", "RegionStats", statInit, {
        menu: "analysis",
        toolbarHTML: toolbarHTML,
        winTitle: "Region Stats",
        menuItem: " Region Stats",
        help: "imexam/imexam.html#rgstat",
        dynamicSelect: true,
        toolbarSeparate: true,
        onregionschange: statUpdate,
        winDims: [280, 280]
    });
})();


