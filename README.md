intel.xdk.multitouch
====================

Allows applications to listen for multiple simultaneous touch events on an Android device

Description
-----------

This object is created to solve the problems with handling multiple simultaneous touches on an Android device. The Android operating system does not handle simultaneous touch events on the browser.

### Methods

-   [enable](#enable) — This method starts listening for Android multi touch events on HTML elements at the cost of some device resources. It must be called if your app requires multitouch.

Methods
-------

### enable

This method starts listening for Android multi touch events on HTML elements at the cost of some device resources. It must be called if your app requires multitouch.

```javascript
intel.xdk.multitouch.enable();
```

#### Description

The enable method tells the application to start listening for multiple touch
events. Once this method is called, we take over the normal touch event
interface.

This capability comes at a cost to device resources, so it should only be used
if your app requires multitouch events. This command will be ignored on an iOS
device.

#### Platforms

-   Apple iOS
-   Google Android

#### Example

```javascript
// This app requires multitouch events,  so enable them.        
intel.xdk.multitouch.enable();                     
```
