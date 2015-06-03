/*
Copyright 2015 Intel Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file 
except in compliance with the License. You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the 
License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, 
either express or implied. See the License for the specific language governing permissions 
and limitations under the License
*/

using Microsoft.Devices.Sensors;
using Microsoft.Phone.Controls;
using Microsoft.Phone.Reactive;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Windows.UI.Core;
using WPCordovaClassLib;
using WPCordovaClassLib.Cordova;
using WPCordovaClassLib.Cordova.Commands;
using WPCordovaClassLib.CordovaLib;

/// <summary>
namespace Cordova.Extension.Commands
{
    /// IntelXDKMultiTouch Command
    /// </summary>
    public class IntelXDKMultiTouch : BaseCommand
    {
        PhoneApplicationPage page = null;
        WebBrowser cordovaBrowser = null;

        private List<String> multitouchQueue = new List<String>();
        private List<String> multitouchMap = new List<String>();
        private bool isMultitouchEnabled = false;
        //static Object lock = null;
        
        private static List<String> messages;

        #region Constructor
        /// <summary>
        /// IntelDebug Constructor
        /// </summary>
        public IntelXDKMultiTouch()
        { 
        }
        #endregion

        #region appMobi.js Handlers
        public void enableMultitouch(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);

            isMultitouchEnabled = true;
        }

        public void getMultitouchData(string parameters)
        {
            string[] args = WPCordovaClassLib.Cordova.JSON.JsonHelper.Deserialize<string[]>(parameters);
        }

        #endregion

        #region Private Methods
        #endregion
    }
}