from django.db import models

from data.models import LineStringTime, PointTimeLabel
from assets.models import AssetType, Asset


class SearchPath(LineStringTime):
    created_for = models.ForeignKey(AssetType, on_delete=models.PROTECT)
    sweep_width = models.IntegerField()
    completed = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(Asset, on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        abstract = True


class SectorSearch(SearchPath):
    datum = models.ForeignKey(PointTimeLabel, on_delete=models.PROTECT)

    GEOJSON_FIELDS = ('pk', 'timestamp', 'created_for', 'sweepwidth', )

    def __str__(self):
        return("Sector Search from {} with {} (sw={})".format(datum, created_for, sweep_width))
