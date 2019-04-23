"""
Helpers for view functions.

The functions here should cover the logic associated with making
views work.
"""

from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest
from django.core.serializers import serialize
from django.contrib.gis.geos import Point, Polygon, LineString, GEOSGeometry
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import PointTimeLabel, PolygonTimeLabel, LineStringTimeLabel


def userobject_not_deleted_or_replaced(objecttype):
    """
    Get all objects that haven't been deleted or replaced.
    Only user created objects have the replaced field.
    """
    return objecttype.objects.exclude(deleted=True).exclude(replaced_by__isnull=False)


def to_geojson(objecttype, objects):
    """
    Convert a set of objects to geojson and return them as an http response
    """
    geojson_data = serialize('geojson', objects, geometry_field=objecttype.GEOFIELD,
                             fields=objecttype.GEOJSON_FIELDS, use_natural_foreign_keys=True)
    return HttpResponse(geojson_data, content_type='application/geo+json')


def to_kml(objecttype, objects):
    """
    Convert a set of objects to kml and return them as an http response
    """
    kml_data = '<?xml version="1.0" encoding="UTF-8"?>\n' + \
               '<kml xmlns="http://www.opengis.net/kml/2.2">\n' + \
               '\t<Document>\n'
    for obj in objects:
        kml_data += '\t\t<Placemark>\n\t\t\t<name><![CDATA[{}]]></name>\n'.format(str(obj))
        kml_data += '\t\t\t<description><![CDATA[{}]]></description>\n'.format(str(obj))
        kml_data += GEOSGeometry(getattr(obj, objecttype.GEOFIELD)).kml
        kml_data += '\n\t\t</Placemark>\n'

    kml_data += '\t</Document>\n</kml>'
    print(kml_data)

    return HttpResponse(kml_data, 'application/vnd.google-earth.kml+xml')


def userobject_replace(objecttype, request, name, object_id, func):
    """
    Create an object to replace another object of the same type,

    Checks to make sure the object hasn't already been deleted or replaced.
    """
    replaces = get_object_or_404(objecttype, pk=object_id)
    if replaces.deleted:
        return HttpResponseNotFound("This {} has been deleted".format(name))
    if replaces.replaced_by is not None:
        return HttpResponseNotFound("This {} has already been replaced".format(name))
    return func(request, replaces=replaces)


def userobject_delete(objecttype, request, name, object_id):
    """
    Mark a user object as deleted

    Checks to make sure the object hasn't already been deleted or replaced.
    """
    obj = get_object_or_404(objecttype, pk=object_id)
    if obj.deleted:
        return HttpResponseNotFound("This {} has already been deleted".format(name))
    if obj.replaced_by is not None:
        return HttpResponseNotFound("This {} has been replaced".format(name))
    obj.deleted = True
    obj.deleted_by = request.user
    obj.deleted_at = timezone.now()
    obj.save()
    return HttpResponse("Deleted")


def point_label_make(request, replaces=None):
    """
    Create or replace a POI based on user supplied data.
    """
    poi_lat = ''
    poi_lon = ''
    poi_label = ''
    if request.method == 'GET':
        poi_lat = request.GET.get('lat')
        poi_lon = request.GET.get('lon')
        poi_label = request.GET.get('label')
    elif request.method == 'POST':
        poi_lat = request.POST.get('lat')
        poi_lon = request.POST.get('lon')
        poi_label = request.POST.get('label')

    if poi_lat is None or poi_lon is None or poi_label is None:
        return HttpResponseBadRequest()

    point = Point(float(poi_lon), float(poi_lat))

    ptl = PointTimeLabel(point=point, label=poi_label, creator=request.user)
    ptl.save()

    if replaces is not None:
        replaces.replaced_by = ptl
        replaces.save()

    return HttpResponse()


def user_polygon_make(request, replaces=None):
    """
    Create a polygon based on user supplied data.
    """
    if request.method == 'POST':
        points = []
        label = request.POST['label']
        points_count = int(request.POST['points'])
        for i in range(0, points_count):
            lat = request.POST['point{}_lat'.format(i)]
            lng = request.POST['point{}_lng'.format(i)]
            point = Point(float(lng), float(lat))
            points.append(point)
        points.append(points[0])
        ptl = PolygonTimeLabel(polygon=Polygon(points), label=label, creator=request.user)
        ptl.save()
        if replaces is not None:
            replaces.replaced_by = ptl
            replaces.save()
        return HttpResponse()

    return HttpResponseBadRequest()


def user_line_make(request, replaces=None):
    """
    Create a line (string) based on user supplied data.
    """
    if request.method == 'POST':
        points = []
        label = request.POST['label']
        points_count = int(request.POST['points'])
        for i in range(0, points_count):
            lat = request.POST['point{}_lat'.format(i)]
            lng = request.POST['point{}_lng'.format(i)]
            point = Point(float(lng), float(lat))
            points.append(point)
        lstl = LineStringTimeLabel(line=LineString(points), label=label, creator=request.user)
        lstl.save()
        print(lstl)
        if replaces is not None:
            replaces.replaced_by = lstl
            replaces.save()
            print(replaces)
        return HttpResponse()

    return HttpResponseBadRequest()
