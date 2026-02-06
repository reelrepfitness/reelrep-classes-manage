# React Native SDK


[changelog-link]: https://github.com/cloudinary/cloudinary-react-native/blob/master/CHANGELOG.md
[alternative-transformations-link]:react_native_image_transformations#alternative_ways_to_apply_transformations

The Cloudinary React Native SDK provides simple, yet comprehensive image and video transformation, optimization, and delivery capabilities that you can implement using code that integrates seamlessly with your React Native application.
> **INFO**: :title=SDK security upgrade, June 2025

We recently released an enhanced security version of this SDK that improves the validation and handling of input parameters. We recommend upgrading to the [latest version][changelog-link] of the SDK to benefit from these security improvements.

## How would you like to learn?

{table:class=no-borders overview}Resource | Description 
--|--
[Cloudinary React Native SDK GitHub repo](https://github.com/cloudinary/cloudinary-react-native) | Explore the source code and see the [CHANGELOG][changelog-link] for details on all new features and fixes from previous versions.
[Video tutorials](tutorial_screencasts) | Watch tutorials relevant to your use cases to learn how to use Cloudinary features. 

Other helpful resources...

This guide focuses on how to set up and implement popular Cloudinary capabilities using the React Native SDK, but it doesn't cover every feature or option. Check out these other resources to learn about additional concepts and functionality in general. 

{table:class=no-borders overview}Resource | Description 
--|--
[Developer kickstart](dev_kickstart) |A hands-on, step-by-step introduction to Cloudinary features.
[Glossary](cloudinary_glossary) | A helpful resource to understand Cloudinary-specific terminology.
[Guides](programmable_media_guides) | In depth guides to help you understand the many, varied capabilities provided by the product. 
[References](cloudinary_references) | Comprehensive references for all APIs, including React Native code examples.

## Install

Cloudinary's React Native library is available as an open-source NPM package. To install the library, run:

```
npm i cloudinary-react-native
```

> **NOTE**: The React Native SDK has a dependency on the Expo module. If you're not using Expo in your project, you will need to [install the module](https://docs.expo.dev/bare/installing-expo-modules) separately in order to use the SDK.

> **NOTE**:
>
> The React Native library must be used in conjunction with the JavaScript [js-url-gen](javascript_integration) library to provide all of Cloudinary's transformation and optimization functionality.
>  Two GitHub repositories provide all the functionality:

> * [js-url-gen](https://github.com/cloudinary/js-url-gen) contains all the functionality required to create delivery URLs for your Cloudinary assets based on the configuration and transformation actions that you specify. All the `js-url-gen` functionality is installed through the `@cloudinary/url-gen` package.

> * [frontend-frameworks](https://github.com/cloudinary/frontend-frameworks) contains the framework libraries and plugins that can be used to render images and videos on your site. There are different installation packages for each framework, so for example, React is installed through `@cloudinary/react`, the Angular SDK is installed through `@cloudinary/ng` and the Vue.js SDK is installed through `@cloudinary/vue`.

## Configure

You can specify the [configuration parameters](cloudinary_sdks#configuration_parameters) that are used to create the delivery URLs, either using a [Cloudinary instance](#cloudinary_instance_configuration) or [per image](#asset_instance_configuration). 

> **NOTE**: Specify the configuration parameters in `camelCase`, for example **cloudName**.

### Cloudinary instance configuration

If you want to use the same configuration to deliver all your media assets, it's best to set up the configuration through a Cloudinary instance, for example:

```react
import React from 'react';
import { SafeAreaView } from 'react-native';
import { AdvancedImage } from 'cloudinary-react-native';
import { Cloudinary } from "@cloudinary/url-gen";

// Create a Cloudinary instance and set your cloud name.
const cld = new Cloudinary({
    cloud: {
        cloudName: 'demo'
    }
});

export default function App() {

    // cld.image returns a CloudinaryImage with the configuration set.
    const myImage = cld.image('sample');

    // The URL of the image is: https://res.cloudinary.com/demo/image/upload/sample

    // Render the image in a React component.
    return (
        <SafeAreaView>
            <AdvancedImage cldImg={myImage} style={{ width: 300, height: 200 }} />
        </SafeAreaView>
    )
};
```

You can set other configuration parameters related to your cloud and URL as required, for example, if you have your own custom delivery hostname, and want to generate a secure URL (HTTPS):

```react

// Create a Cloudinary instance, setting some Cloud and URL configuration parameters.
const cld = new Cloudinary({
  cloud: {
    cloudName: 'demo'
  },
  url: {
    secureDistribution: 'www.example.com', 
    secure: true 
  }
});

// This creates a URL of the form: https://www.example.com/demo/image/upload/sample
```

### Asset instance configuration

If you need to specify different configurations to deliver your media assets, you can specify the configuration per image instance, for example:

```react
import React from 'react';
import { SafeAreaView } from 'react-native';
import { AdvancedImage } from 'cloudinary-react-native';
import { CloudinaryImage } from "@cloudinary/url-gen";
import { URLConfig } from "@cloudinary/url-gen";
import { CloudConfig } from "@cloudinary/url-gen";

// Set the Cloud configuration and URL configuration
let cloudConfig = new CloudConfig({ cloudName: 'demo' });
let urlConfig = new URLConfig({ secure: true });

export default function App() {

    // Instantiate and configure a CloudinaryImage object.
    let myImage = new CloudinaryImage('docs/shoes', cloudConfig, urlConfig);

    // The URL of the image is: https://res.cloudinary.com/demo/image/upload/docs/shoes

    // Render the image in a React component.
    return (
        <SafeAreaView>
            <AdvancedImage cldImg={myImage} style={{ width: 300, height: 200 }} />
        </SafeAreaView>
    )
};
```

## Use

Once you've installed and configured the React Native SDK, you can use it to transform and deliver your images and videos.

Capitalization and data type guidelines...

When using the React Native SDK, keep these guidelines in mind:  

* Parameter names: `camelCase`. For example: **cloudName**
* Classes: `PascalCase`. For example: **CloudinaryImage**
* Methods: `camelCase`. For example: **cld.image**
* Pass parameter data as: `Object`

### Quick example: File upload

The following React Native code uploads the `dog.mp4` video using the public\_id, `my_dog`. The video overwrites the existing `my_dog` video if it exists. When the video upload finishes, the specified notification URL receives details about the uploaded media asset.

```react
import { Cloudinary } from "@cloudinary/url-gen";
import { upload } from 'cloudinary-react-native';

const cld = new Cloudinary({
    cloud: {
        cloudName: 'demo'
    },
    url: {
        secure: true
    }
});

const options = {
    upload_preset: 'my_preset',
    public_id: 'my_dog',
    resource_type: 'video',
    overwrite: true,
    notification_url: 'https://mysite.example.com/notify_endpoint'
};

await upload(cld, {
    file: 'dog.mp4',
    options: options,
    callback: (error, response) => {
        //.. handle response
    }
});
```

The result of the upload API call is an object that provides information about the uploaded media asset, including the assigned public ID and its URL.

> **Learn more about upload**:
>
> * Read the [Upload guide](upload_images) to learn more about customizing uploads, using upload presets and more.

> * See more examples of [image and video upload](react_native_image_and_video_upload) using the Cloudinary React Native library.  

> * Explore the [Upload API reference](image_upload_api_reference) to see all available methods and options.

### Quick example: Transform and optimize

Take a look at the following transformation code and the image it delivers:

```react
import React from 'react';
import { SafeAreaView } from 'react-native';
import { AdvancedImage } from 'cloudinary-react-native';
import { Cloudinary } from "@cloudinary/url-gen";

// Import required actions.
import { sepia } from "@cloudinary/url-gen/actions/effect";

export default function App() {

    // Create and configure your Cloudinary instance.
    const cld = new Cloudinary({
        cloud: {
            cloudName: 'demo'
        }
    });

    // Use the image with public ID, 'front_face'.
    const myImage = cld.image('front_face');

    // Apply the transformation.
    myImage
      .effect(sepia());  // Apply a sepia effect.

    // Render the transformed image in a React Native component.
    return (
      <SafeAreaView style={{flex: 1, justifyContent: 'center'}}>
        <AdvancedImage cldImg={myImage} style={{ width: 200, height: 200, alignSelf: 'center'}} />
      </SafeAreaView>
    )
};

```

This code creates the HTML required to deliver the front_face.jpg image with the sepia effect applied.

![sample transformation](https://res.cloudinary.com/demo/image/upload/e_sepia/front_face "with_url:false, with_code:false, thumb: f_auto/w_100/u_docs:iphone_template,h_300")

You can apply more than one transformation at a time (see [chained transformations](image_transformations#chained_transformations)) to give more interesting results:

![sample transformation](https://res.cloudinary.com/demo/image/upload/c_thumb,g_face,h_150,w_150/r_20/e_sepia/l_cloudinary_icon/c_scale,w_50/o_60/e_brightness:90/fl_layer_apply,g_south_east,x_5,y_5/a_10/f_png/front_face "disable_all_tab: true, frameworks:react_2, thumb: f_auto/w_100/u_docs:iphone_template,h_300")

```react
new CloudinaryImage("front_face")
  .resize(
    thumbnail()
      .width(150)
      .height(150)
      .gravity(focusOn(face()))
  )
  .roundCorners(byRadius(20))
  .effect(sepia())
  .overlay(
    source(
      image("cloudinary_icon").transformation(
        new Transformation()
          .resize(scale().width(50))
          .adjust(opacity(60))
          .adjust(brightness().level(90))
      )
    ).position(
      new Position()
        .gravity(compass("south_east"))
        .offsetX(5)
        .offsetY(5)
    )
  )
  .rotate(byAngle(10))
  .delivery(format(png()));
```

This relatively simple code performs all of the following on the original front_face.jpg image before delivering it:

* **Crop** to a 150x150 thumbnail using face-detection gravity to automatically determine the location for the crop
* **Round the corners** with a 20 pixel radius
* Apply a **sepia effect**
* **Overlay the Cloudinary logo** on the southeast corner of the image (with a slight offset). The logo is scaled down to a 50 pixel width, with increased brightness and partial transparency (opacity = 60%)
* **Rotate** the resulting image (including the overlay) by 10 degrees
* **Convert** and deliver the image in PNG format (the originally uploaded image was a JPG)
> **TIP**: There are [alternative ways to apply transformations][alternative-transformations-link] to your images, for example:

```js
import { transformationStringFromObject } from "@cloudinary/url-gen";

const transformation = transformationStringFromObject([
  {gravity: "face", height: 150, width: 150, crop: "thumb"},
  {radius: 20},
  {effect: "sepia"},
  {overlay: "cloudinary_icon"},
  {width: 50, crop: "scale"},
  {opacity: 60},
  {effect: "brightness:90"},
  {flags: "layer_apply", gravity: "south_east", x: 5, y: 5},
  {angle: 10},
  {fetch_format: "png"}
  ]);
myImage.addTransformation(transformation);
```
> **Learn more about transformations**:
>
> * Read the [Transform and customize assets](image_transformations) guide to learn about the different ways to transform your assets.

> * See more examples of [image](react_native_image_transformations) transformations using the `@cloudinary/url-gen` library.  

> * See all possible transformations in the [Transformation URL API reference](transformation_reference).

> * See all JavaScript transformation actions and qualifiers in the [Transformation Builder reference](https://cloudinary.com/documentation/sdks/js/transformation-builder/list_namespace.html).

> **READING**:
>
> * Learn more about transforming your assets using the `@cloudinary/url-gen` package in [React Native image transformations](react_native_image_transformations).

> * Stay tuned for updates by following the [Release Notes](programmable_media_release_notes) and the [Cloudinary Blog](https://cloudinary.com/blog).
