from django.conf.urls import patterns, include, url
from django.views.generic import TemplateView

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()


api_urlpatterns = patterns('walt.api',
    url(r'^$', 'index'),
    url(r'access-denied/$', 'access_denied'),
    url(r'u/assignment/$', 'user_assignments'),
    url(r'u/document/$', 'user_documents'),
    url(r'u/document/(?P<pk>\d+)$', 'user_document'),
    url(r'(?P<model_name>[a-zA-Z_]+)/$', 'get_objects'),
    url(r'(?P<model_name>[a-zA-Z_]+)/(?P<pk>\d+)$', 'get_object'),
)


urlpatterns = patterns('walt.views',
    # home
    url(r'^$', 'home', name='walt_home'),

    # login / logout
    url(r'^logout/$', 'logout_view', name='walt_logout'),
    url(r'^login/$', 'login_view', name='walt_login'),
    url(r'^ouch/$', 'not_found', name='not_found'),

    # url(r'^frontcast/', include('frontcast.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    url(r'^d/$', 'document', name='walt_empty_document'), #i.e. user page
    url(r'^d/(?P<slug>[a-z\.-]+)/$', 'document', name='walt_document'), #i.e. user page

    url(r'^u/$', 'spiff', name='walt_empty_spiff'), #i.e. user page
    url(r'^u/(?P<username>[a-z\.]+)/$', 'spiff', name='walt_spiff'), #i.e. user page

    url(r'^t/(?P<pk>\d+)/$', 'task', name='walt_task'), #i.e. user page
    #url(r'^robots\.txt$',  TemplateView.as_view(direct_to_template, {'template': 'frontcast/robots.txt', 'mimetype': 'text/plain'}),
    #//url(r'^humans\.txt$', direct_to_template, {'template': 'frontcast/humans.txt', 'mimetype': 'text/plain'}),
    # url(r'^crossdomain\.xml$', direct_to_template, {'template': 'frontcast/crossdomain.xml', 'mimetype': 'text/xml'}),


    url(r'^video/$', 'spiff_video', name='walt_video'), # add video metadata ? provide upload features.

    # admin only pages
    url(r'^setup/$', 'setup', name='walt_setup'), # add video metadata ? provide upload features.

    # restful api
    url(r'^api/', include(api_urlpatterns))
)
