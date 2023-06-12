from dataclasses import dataclass, InitVar

import numpy as np

from pyodide.ffi import to_js
from js import Uint8ClampedArray


@dataclass
class DecompImage:
    res: InitVar[int]

    array: np.ndarray = None
    mean: np.ndarray = None
    std: np.ndarray = None

    def __post_init__(self, res: int):
        if self.array is None:
            self.array = np.zeros((res, res, 4))
        
        self.mean = self.array.mean(axis=(0, 1))
        self.std = self.array.std(axis=(0, 1))


@dataclass
class DecompLevel:
    res: int
    color: DecompImage = None
    delta: DecompImage = None

    def __post_init__(self):
        if self.color is None:
            self.color = DecompImage(res=self.res)
        
        if self.delta is None:
            self.delta = DecompImage(res=self.res)


def get_empty_decomp(
        res: int,
        fill_default: bool = False,
) -> list[DecompLevel]:
    """
    Get an empty decomposition, optionally with nonzero defaults
    """
    decomp = [
        DecompLevel(2**n)
        for n in range(int(np.log2(res)) + 1)
    ]
    if fill_default:
        for level in decomp:
            # Set more interesting defaults
            level.color.mean.fill(128)
            level.delta.std.fill(16)

    return decomp


def downsample(
        image: np.ndarray,
        res: int,
) -> np.ndarray:
    """
    Box downsample a (N, N, C) image to the specified resolution.
    res should divide N.
    """
    h, w, c = image.shape
    return (
        image.transpose(2, 0, 1)
        .reshape(c, res, h // res, res, w // res)
        .mean(axis=(2, 4))
        .transpose(1, 2, 0)
    )


def upsample(
        image: np.ndarray,
        res: int,
) -> np.ndarray:
    """
    Nearest neighbor upsample a (N, N, C) image to the specified resolution.
    res should be a multiple of N.
    """
    h, w = image.shape[:2]
    return image.repeat(res // h, axis=0).repeat(res // w, axis=1)



class V1Synth:
    res: int
    synth_image: np.ndarray
    base_decomp: list[DecompLevel]
    new_decomp: list[DecompLevel]

    def __init__(self, res: int):
        self.res = res
        self.synth_image = np.full((res, res, 4), 128)
        self.synth_image[:, :, 3] = 255
        self.base_decomp = get_empty_decomp(res)
        self.new_decomp = get_empty_decomp(res, fill_default=True)


    def handle_upload(self, new_image_flat):
        """
        Convert uploaded flat image to numpy array and update decomps
        """
        new_image = np.array(new_image_flat.to_py()).reshape(self.res, self.res, 4)

        # Iteratively downsample image
        _image = new_image
        for level in self.base_decomp[::-1]:
            level.color.array = downsample(_image, level.res)
            _image = level.color.array

        # Should be 1x1x4 at this point
        color_mean = _image[0, 0]

        # Iteratively upsample to compute deltas
        # First delta should be same as color
        _image = np.zeros((1, 1, 4))
        for n, level in enumerate(self.base_decomp):
            _image = upsample(_image, level.res)
            level.delta.array = level.color.array - _image
            _image = level.color.array

            # Also assign means and stds here

            level.color.mean = color_mean
            level.color.std = level.color.array.std(axis=(0, 1))

            # Set delta mean to color mean if first level (0 otherwise)
            if n == 0:
                level.delta.mean = color_mean

            level.delta.std = level.delta.array.std(axis=(0, 1))

            # Copy mean and std to new decomp
            self.new_decomp[n].color.mean = level.color.mean
            self.new_decomp[n].color.std = level.color.std
            self.new_decomp[n].delta.mean = level.delta.mean
            self.new_decomp[n].delta.std = level.delta.std


    def update_synth(self, t_value: float):
        """
        Resample new decomp at t value and assign to synth image
        """
        decomp_index = round(t_value * (len(self.new_decomp) - 1))
        new_level = self.new_decomp[decomp_index]
        if decomp_index == 0:
            new_level.color.array = new_level.color.mean[None, None, :]
        else:
            lower_level = self.new_decomp[decomp_index - 1]
            new_level.color.array = (
                upsample(lower_level.color.array, new_level.res)
                + np.random.randn(new_level.res, new_level.res, 4)
                * new_level.delta.std
            )

        # Always sample alpha as 255
        new_level.color.array[:, :, 3] = 255

        self.synth_image = upsample(new_level.color.array, self.res)



    def get_flat_synth_image(self) -> Uint8ClampedArray:
        """
        Get flat image from synth image
        """
        return Uint8ClampedArray.new(to_js(
            self.synth_image.reshape(-1).clip(0, 255).astype(np.uint8)
        ))
