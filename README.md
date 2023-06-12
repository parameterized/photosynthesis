# Photosynthesis

Image-based texture synthesis

## Running

Run the application by either going to [parameterized.github.io/photosynthesis](https://parameterized.github.io/photosynthesis/) or downloading the code and running an HTTP server at the root directory (e.g. `python -m http.server`)

Press F to frog

## Methods

- V1
  - Images are generated hierarchically and additively
  - The base color is the average of the input image
  - A hierarchical decomposition is computed with global standard deviations per channel of the differences between higher and lower resolution images
  - As a level of detail bar moves forward and backward, the corresponding resolution is continuously resampled as an offset from the lower resolution generated image, using the computed delta standard deviation for that resolution

- V2
  - (not implemented yet)
  - Optimize a linear model to predict a center pixel from the surrounding 8 pixel neighborhood, along with expected per-channel error for the prediction
  - After a resolution's initial sampling with V1's delta method, resampling is done directly on output color using the neighborhood prediction as the mean and the predicted error as the standard deviation
  - The output colors are then scaled and recentered to match the statistics for this resolution
