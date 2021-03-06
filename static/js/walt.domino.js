;(function(window, jQuery, domino, undefined) {
  'use strict';

  window.walt = window.walt || {};
  walt.domino ={};

  // Domino global settings:
  domino.settings({
    shortcutPrefix: '::',
    displayTime: true,
    verbose: true,
    strict: true,
    clone: false
  });

  if (!domino.struct.isValid('walt.scene'))
    domino.struct.add({
      id: 'walt.scene',
      struct: function(v) {
        return !!~walt.SCENES.indexOf(v);
      }
    });

  if (!domino.struct.isValid('walt.ui_status'))
    domino.struct.add({
      id: 'walt.ui_status',
      struct: function(v) {
        return !!~walt.UI_STATUSES.indexOf(v);
      }
    });

  walt.domino.init = function(){
    walt.domino.controller = new domino({
      name: 'walt',
      properties: [
        /*

          data Models
          ===========

        */
        {
          id: 'data_documents',
          type: {
            items: ['object'],
            ids: ['string'],
            limit: 'number',
            offset: 'number',
            length: 'number', // total_count of items - limit infinite loiading
          },
          value: {
            items: [],
            ids: [],
            limit: 0,
            offset: 0,
            length: 0,
          },
          dispatch: ['data_documents__updated']
        },
        {
          id: 'data_assignments',
          type: {
            items: ['object'],
            ids: ['string'],
            limit: 'number',
            offset: 'number',
            length: 'number', // total_count of items - limit infinite loiading
          },
          value: {
            items: [],
            ids: [],
            limit: 0,
            offset: 0,
            length: 0,
          },
          dispatch: ['data_assignments__updated']
        },
        {
          id: 'data_references',
          type: {
            items: 'object',
            ids: ['string']
          },
          value: {
            items: {},
            ids: []
          },
          dispatch: ['data_references__updated']
        },
        /*

          Routing mechanism
          =================

          Note: the layout actually change only when scene action is updated.
          Any other changement make only local changements.

        */
        {
          id: 'scene',
          description: 'basic app view',
          type: 'walt.scene',
          value: walt.SCENE_STARTUP,
          triggers: 'scene__update',
          dispatch: ['scene__updated']
        },
        /*

          Ui status
          =========
        
          This proerty implements a status mechanism to prevent data overload

        */
        {
          id: 'ui_status',
          description: 'true or false lock mechanism to preserve data loading from overload',
          type: 'walt.ui_status',
          value: walt.UI_STATUS_UNLOCKED,
          triggers: 'lock__update',
          dispatch: ['lock__updated']
        },
      ],
      shortcuts: [
        {
          id: 'is_locked',
          description: 'Returns true if ui_status allows ui events to be performed',
          method: function() {
            return this.get('ui_status') == walt.UI_STATUS_UNLOCKED;
          }
        }
      ],
      hacks: [
        /*

          data Models Hacks
          =================

          Note that _changed is triggered every time the data model changed

        */
        {
          triggers: 'data_document__changed',
          description: 'documents items collection changed',
          method: function(){

          }
        },
        /*

          SCENE Hacks
          ===========

        */
        {
          triggers: 'scene__updated',
          description: 'according to the scene to perrform, it loads related data through services',
          method: function(event) {
            var scene = this.get('scene'),
                services = [];

            this.log( scene );
            walt.domino.controller.update('ui_status',walt.UI_STATUS_LOCKED);

            switch(scene){
              case walt.SCENE_STARTUP:
                services = [
                  {
                    service: 'get_documents',
                    limit: 10,
                    offset:0
                  },
                  {
                    service: 'get_assignments',
                    limit: 10,
                    offset:0
                  }
                ];
                break;
            }; // end of switch scene

            this.request(services, {
              success: function() {
                walt.domino.controller.update('ui_status', walt.UI_STATUS_UNLOCKED);
                walt.domino.controller.dispatchEvent('scene__synced');
              }
            });

          }
        },
        {
          triggers: 'scene__synced',
          description: 'data loading completed, proceed according to the scene to perrform!',
          method: function(event) {
            walt.log('scene synced, ui status:', this.get('ui_status') )

          }
        },
        /*

          content related hacks
          =====================

          fill_*_with__* load and complete related document field
        */
        {
          triggers: 'fill_document_with_oembed',
          description: 'execute the get_<event.data.provider>_oembed service and try to fill all fields given',
          method: function(event){
            walt.domino.controller.update('ui_status',walt.UI_STATUS_LOCKED);

            this.request('get_'+ event.data.provider +'_oembed',{
              url:event.data.url,
              success: function(data, params) {
                walt.log(':success,','get_vimeo_oembed', data, params);
                params.provider = params.service.match('_([a-z]+)_').pop()
                walt.domino.controller.update('ui_status', walt.UI_STATUS_UNLOCKED);
                walt.domino.controller.dispatchEvent('filled_document_with_oembed',{
                  data:data,
                  params:params
                });
              }
            });
          }
        },
        {
          triggers: 'filled_document_with_oembed'
        },
        /*

          Services hacks
          ==============
          
          Lock and unlock UI fopr every request provided.
          usage: walt.domino.controller.dispatchEvent('call_service',{
            service: get_documents,
            params: {
              limit:2, offset:2
            }
          })
        */
        {
          triggers: 'call_service',
          method: function(event){
            walt.domino.controller.update('ui_status',walt.UI_STATUS_LOCKED);
            walt.log('call_service', event.data);
            var service = event.data.service || "untitled",
                params = event.data || {};
            
            this.request([{service: service, params:params}],{
              success:  function() {
                walt.domino.controller.update('ui_status',walt.UI_STATUS_UNLOCKED);
              }
            });
          }
        }
      ],

      /*

        Services
        ========

        How to test services:
        var d = domino.instances('maze');
        d.request('service_name',{offset:10, limit:20, query:'query search'})

        service types: get, create, modify, remove

      */
      services: [
        { 
          id: 'get_documents',
          type: 'GET',
          url: walt.urls.user_documents,
          dataType: 'json',
          data: function(input) {
            return input.params;
          },
          success: function(data) {
            // todo infinite adding not replacing items.
            this.update({
              data_documents: {
                items: data.objects,
                ids:$.map(data.objects, function(e){return ''+e.id;}),
                length: +data.meta.total_count,
                limit: +data.meta.limit || data.objects.length,
                offset: data.meta.offset || 0
              }
            });
          }
        },
        { 
          id: 'create_document',
          type: 'POST',
          url: walt.urls.user_documents,
          before: function(params, xhr){
            xhr.setRequestHeader("X-CSRFToken", walt.CSRFTOKEN);
          },
          dataType: 'json',
          data: function(input) {
            return input.params;
          },
          success: function(data) {
            
          }
        },
        { 
          id: 'modify_document',
          type: 'POST',
          url: walt.urls.user_document,
          before: function(params, xhr){
            xhr.setRequestHeader("X-CSRFToken", walt.CSRFTOKEN);
          },
          dataType: 'json',
          data: function(params) {
            return params;
          },
          success: function(data, params) {

          }
        },
        { 
          id: 'get_assignments',
          type: 'GET',
          url: walt.urls.user_assignments,
          dataType: 'json',
          data: function(params) {
            return params;
          },
          success: function(data, params) {
            var ids = [];

            for ( var i in data.objects)
              ids.push(''+data.objects[i].id);
            
            this.update({
              data_assignments: {
                items: data.objects,
                ids:ids,
                length: +data.meta.total_count,
                limit: +data.meta.limit || data.objects.length,
                offset: data.meta.offset || 0
              }
            });
          }
        },
        { 
          id: 'complete_assignments',
          type: 'GET',
          url: walt.urls.user_documents,
          dataType: 'json',
          data: function(params) {
            return params;
          },
          success: function(data, params) {


          }
        },
        /*
          
          Non WALTY endpoints
          ===================

          BIBLIB references, vimeo oembed endpoint etc...

        */
        {
          id: 'get_references',
          url: walt.urls.references, 
          type: walt.rpc.type,
          error: walt.rpc.error,
          expect: walt.rpc.expect,
          contentType: walt.rpc.contentType,
          before: function(params, xhr){
            xhr.setRequestHeader("X-CSRFToken", walt.CSRFTOKEN);
          },
          async: true,
          data: function( input ) { // input={action:'citation_by_rec_ids', params:{} )
             return walt.rpc.buildData( input.action, input.params);
          },
          success: function(data, params) {
          }
        },
        {
          id: 'get_vimeo_oembed',
          url: 'http://vimeo.com/api/oembed.json',
          data: function(params) {
            var p = {
              url: params.url
            };
            return p;
          },
          success:function(data, params){
            this.log('get_vimeo_oembed', 'get_vimeo_oembed service success function');
          }
        },
        {
          id: 'get_youtube_oembed',
          url: walt.urls.oembed_youtube,
          data: function(params) {
            var p = {
              url: params.url,
              format: 'json'
            };
            return p;
          },
          success:function(data, params){
            this.log('get_youtube_oembed', 'get_youtube_oembed service success function');
          }
        },
        {
          id: 'get_flickr_oembed',
          url: walt.urls.oembed_flickr,
          data: function(params) {
            var p = {
              url: params.url,
              format: 'json'
            };
            return p;
          },
          success:function(data, params){
            this.log('get_flickr_oembed', 'get_flickr_oembed service success function');
          }
        }
      ]
    });

    /*

        instantiate Domino modules
        ---
    */
    walt.domino.controller.addModule( walt.domino.modules.Layout, [walt.domino.controller], {id:'layout'});
    walt.domino.controller.addModule( walt.domino.modules.List, null, {id:'list'});
    walt.domino.controller.addModule( walt.domino.modules.Route, null, {id:'route'});

    walt.domino.controller.log('module instantiated');
    walt.domino.controller.dispatchEvent('init');
    /*

        Start!
        ---
    */
  };

})(window, jQuery, domino);
