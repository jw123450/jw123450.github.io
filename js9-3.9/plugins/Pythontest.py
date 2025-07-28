import pyjs9
import numpy
from pyjs9 import JS9

# Connect to a JS9 instance (usually on localhost)
js9 = JS9()

# Open an image (replace with your file path)
#js9.Load("test.fits")

# Create a region
js9.AddRegions('circle(100,100,20)')

# Run a command
js9.SetColormap("cool")

# Extract region data
regions = js9.GetRegions()
print("Regions:", regions)

# Save an image snapshot
#js9.SavePNG("/tmp/output.png")


j = pyjs9.JS9()
j.GetColormap()
#{'bias': 0.5, 'colormap': 'grey', 'contrast': 1}
j.SetColormap('red')
j.cmap()

print("working?")
print(j)
#hdul = j.GetFITS()
#hdul.info()

#narr = j.GetNumpy()
#narr.shape
