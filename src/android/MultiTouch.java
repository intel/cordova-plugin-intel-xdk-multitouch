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

package com.intel.xdk.multitouch;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.concurrent.CopyOnWriteArrayList;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.os.Build;
import android.util.Log;
import android.util.SparseArray;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;

public class MultiTouch extends CordovaPlugin {
    private Activity activity = null;
	private CopyOnWriteArrayList<String> multitouchQueue = new CopyOnWriteArrayList<String>();
	private SparseArray<String> multitouchMap = new SparseArray<String>();
	boolean isMultitouchEnabled = true;
	static Object lock = null;
	private static ArrayList<String> messages;
	View.OnTouchListener touchy;
    
    public MultiTouch(){
    }

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);

        //get convenience reference to activity
        activity = cordova.getActivity();
        
        activity.runOnUiThread(new Runnable() {
            public void run() {
                if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                	try {
                		Method m = WebView.class.getMethod("setWebContentsDebuggingEnabled", boolean.class);
                		m.invoke(WebView.class, true);
        			} catch (Exception e) {
        				// TODO Auto-generated catch block
        				e.printStackTrace();
        			}
                	//WebView.setWebContentsDebuggingEnabled(true);
                }
            }
        });
        
        touchy = new View.OnTouchListener() {

			private SparseArray<Long> pointerId2Identifier = new SparseArray<Long>(); 
			@Override
		    public boolean onTouch(View v, MotionEvent ev) {
		    	if(isMultitouchEnabled) {
					int pointerCount = ev.getPointerCount();
					
					//get the correct action
					int maskedAction = ev.getActionMasked();
					int idx = ev.getActionIndex();
					try {
						String js = null;
						if(maskedAction==MotionEvent.ACTION_POINTER_DOWN || maskedAction==MotionEvent.ACTION_DOWN) {
							int x =  (int)ev.getX(idx);
							int y =  (int)ev.getY(idx);
							int h =  (int)v.getHeight();
							int w =  (int)v.getWidth();
							int id = ev.getPointerId(idx);
							//make a timestamp identifier and store it
							long identifier = System.currentTimeMillis();
							pointerId2Identifier.put(id, identifier);
							js = String.format("{id:%d,x:%d,y:%d,h:%d,w:%d,type:'touchstart'},",identifier,x,y,h,w);
							queueMultitouchData(js, id, maskedAction);
						} else if (maskedAction==MotionEvent.ACTION_POINTER_UP || maskedAction==MotionEvent.ACTION_UP) {
							int x =  (int)ev.getX(idx);
							int y =  (int)ev.getY(idx);
							int h =  (int)v.getHeight();
							int w =  (int)v.getWidth();
							int id = ev.getPointerId(idx);
							js = String.format("{id:%d,x:%d,y:%d,h:%d,w:%d,type:'touchend'},",pointerId2Identifier.get(id),x,y,h,w);
							pointerId2Identifier.remove(id);
							queueMultitouchData(js, id, maskedAction);
						} else if (maskedAction==MotionEvent.ACTION_MOVE) {
							//send all events if it is a move
							for(int i=0;i<pointerCount;i++) {
								int x =  (int)ev.getX(i);
								int y =  (int)ev.getY(i);
								int h =  (int)v.getHeight();
								int w =  (int)v.getWidth();
								int id = ev.getPointerId(i);
								js = String.format("{id:%d,x:%d,y:%d,h:%d,w:%d,type:'touchmove'},",pointerId2Identifier.get(id),x,y,h,w);
								queueMultitouchData(js, id, maskedAction);
							}
						} else {
							Log.e("[intel.xdk]", "got a MotionEvent that is not up/down/move:"+ ev);
						}
						//Log.i("[intel.xdk]", "onTouchEvent:"+js);
					} catch (Exception e) {
						Log.e("[intel.xdk]", "Got an exception back from WebView: ", e);
					}
					
					return true;
		    	} else {
		            return false;
		    	}
		    }
        };
        webView.setOnTouchListener(touchy);
        
        lock = this;
        messages = new ArrayList<String>(0); 
    }

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action            The action to execute.
     * @param args              JSONArray of arguments for the plugin.
     * @param callbackContext   The callback context used when calling back into JavaScript.
     * @return                  True when the action was valid, false otherwise.
     */
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("enableMultitouch")) {
        	enableMultitouch();
        }
        else if (action.equals("disableMultitouch")) {
        	disableMultitouch();
        }
        else if (action.equals("queueMultitouchData")) {
            queueMultitouchData(args.getString(0), args.getInt(1), args.getInt(2));
        }
        else if (action.equals("getMultitouchData")) {
        	String js = getMultitouchData();
        	JSONArray r = new JSONArray(js);
            callbackContext.success(r);
        }
        else if (action.equals("messagePump")) {
          JSONObject r = new JSONObject();
          r.put("message", new JSONObject(messagePump()));
          callbackContext.success(r);
        	
        }
        else if (action.equals("addMessage")) {
        	addMessage(args.getString(0));
        }
        else if (action.equals("")) {
        	this.enableMultitouch();
        }
        else {
            return false;
        }

        return true;
    }

    //--------------------------------------------------------------------------
    // LOCAL METHODS
    //--------------------------------------------------------------------------    
	//note - this is not part of the javascript interface, but needs to be enabled because it is called by appmobi.js

    public void enableMultitouch() {
		this.multitouchQueue = new CopyOnWriteArrayList<String>();
		this.multitouchMap = new SparseArray<String>();
		this.isMultitouchEnabled = true;
	}
	
	public void disableMultitouch() {
		this.isMultitouchEnabled = false;
		this.multitouchQueue.clear();
		this.multitouchQueue = null;
		this.multitouchMap.clear();
		this.multitouchMap = null;
	}

	public void queueMultitouchData(String js, int id, int maskedAction) {
		//Log.i("[appMobi]", "queueMultitouchData:"+js);
		
		if(maskedAction==MotionEvent.ACTION_POINTER_DOWN || maskedAction==MotionEvent.ACTION_DOWN) {
			//touchstart: create list
			//this.multitouchMap.put(id, new ArrayList<String>());

		} else if (maskedAction==MotionEvent.ACTION_POINTER_UP || maskedAction==MotionEvent.ACTION_UP) {
			//touchend: remove list
			this.multitouchMap.remove(id);

		} else if (maskedAction==MotionEvent.ACTION_MOVE) {
			//touchmove: flush stale touchmove events and and update list
			String stale = this.multitouchMap.get(id);
			this.multitouchQueue.remove(stale);
			this.multitouchMap.put(id, js);
		}

		this.multitouchQueue.add(js);
	}
	
	public String getMultitouchData() {
		if(this.multitouchQueue == null || this.multitouchQueue.isEmpty()) 
			return "[]";
		
		StringBuilder s = new StringBuilder(40*this.multitouchQueue.size());
		s.append('[');
		Iterator<String> it = this.multitouchQueue.iterator();
		while(it.hasNext()) {
			s.append(it.next());
		}
		this.multitouchQueue.clear();
		s.append(']');
		String js = s.toString();
		if(!"[]".equals(js)) {
			Log.d("touch", js);
		}
		return js;
	}
	
	public String messagePump()
	{
		String message = null;
		
		synchronized(lock)
		{
			if( messages.size() > 0 )
				message = messages.remove(0);
		}
		
		return message;	
	}
	
	public static void addMessage(String message)
	{		
		synchronized(lock)
		{
			messages.add(message);
		}
	}    

}