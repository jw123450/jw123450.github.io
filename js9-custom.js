<script>
  JS9.AddOnLoad(im => {
    JS9.Keyboard.actions["z"] = function () {
      const regions = JS9.GetRegions({ display: im.display.id });
      if (!regions.length) {
        alert("No region available.");
        return;
      }

      const sel = regions.find(r => r.selected);
      if (!sel) {
        alert("No region selected.");
        return;
      }

      const newFixed = !sel.fixedSize;
      JS9.ChangeRegions("fixedSize", newFixed, { id: sel.id, display: im.display.id });

      const shape = JS9.lookupRegions({ display: im.display.id }, sel.id)?.shape;
      if (shape) {
        shape.lockScalingX = newFixed;
        shape.lockScalingY = newFixed;
        shape.setCoords();
      }

      alert(`fixedSize = ${newFixed}`);
    };
  });
</script>
