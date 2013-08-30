import logging

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import Group
from django.http import HttpResponse, HttpRequest, HttpResponseRedirect
from django.shortcuts import render_to_response, redirect, get_object_or_404
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils.translation import get_language

from glue.utils import Epoxy

from walt.forms import LoginForm
from walt.models import Assignment

from frontcast import local_settings

logger = logging.getLogger('glue')


def login_view( request ):

	form = LoginForm( request.POST )
	next = request.REQUEST.get('next', 'walt_home')

	login_message = { 'next': next if len( next ) else 'walt_home'}

	if request.method != 'POST':
		data = _shared_data( request, tags=[ "index" ], d=login_message )
		return render_to_response('walt/login.html', RequestContext(request, data ) )

	if form.is_valid():
		user = authenticate(username=form.cleaned_data['username'], password=form.cleaned_data['password'])
		if user is not None:
			if user.is_active:
				login(request, user)
				# @todo: Redirect to next page

				return redirect( login_message['next'] )
			else:
				login_message['error'] = _("user has been disabled")
		else:
			login_message['error'] = _("invalid credentials")
			# Return a 'disabled account' error message
	else:
		login_message['error'] = _("invalid credentials")
		login_message['invalid_fields'] = form.errors


	data = _shared_data( request, tags=[ "index" ], d=login_message )


	return render_to_response('walt/login.html', RequestContext(request, data ) )

def logout_view( request ):
	logout( request )
	return redirect( 'walt_home' )


def home( request ):
	data = _shared_data( request, tags=['home'] )

	if data['pending_tasks'] > 0:
		return homeworks( request, data )
	return render_to_response(  "walt/index.html", RequestContext(request, data ) )


@login_required
def homeworks( request, data=None ):
	data = data if data is not None else _shared_data( request )
	data['tags'] = ['me']
	return render_to_response(  "walt/homeworks.html", RequestContext(request, data ) )


@staff_member_required
def setup( request ):
	data = {}

	for g in local_settings.WALT_AFFILIATIONS:
		Group.objects.get_or_create( name=g[ 'name' ] )

	data[ 'affiliations' ] = Group.objects.all()

	for g in local_settings.WALT_ROLES:
		Group.objects.get_or_create( name=g[ 'name' ] )

	data[ 'actions' ]

	return render_to_response(  "walt/setup.html", RequestContext(request, data ) )


#
#	Add video metadata to biblib for reference principes
#
def spiff_video( request ):
	data = _shared_data( request, tags=['me'])
	return render_to_response(  "walt/video.html", RequestContext(request, data ) )


@login_required
def spiff( request, username ):
	data = _shared_data( request, tags=['me'])
	data['username'] = username

	return render_to_response(  "walt/spiff.html", RequestContext(request, data ) )


def _shared_data( request, tags=[], d={} ):
	d['tags'] = tags
	d['pending_tasks'] = 0

	if request.user.is_authenticated():
		# get pending tasks
		d['pending_tasks'] = Assignment.objects.filter( profile__user=request.user, date_completed__isnull=True ).count()

	return d
