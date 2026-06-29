"""Geospatial property tests."""
from hypothesis import given, settings
from hypothesis import strategies as st

from app.services.geo import haversine_m

_lat = st.floats(min_value=-89, max_value=89, allow_nan=False)
_lng = st.floats(min_value=-179, max_value=179, allow_nan=False)


@given(lat=_lat, lng=_lng)
@settings(max_examples=100)
def test_distance_to_self_is_zero(lat, lng):
    assert haversine_m(lat, lng, lat, lng) < 1e-3


@given(a=_lat, b=_lng, c=_lat, d=_lng)
@settings(max_examples=200)
def test_distance_symmetric_and_non_negative(a, b, c, d):
    f = haversine_m(a, b, c, d)
    r = haversine_m(c, d, a, b)
    assert f >= 0
    assert abs(f - r) < 1e-6


def test_known_distance_hyderabad():
    # Serilingampalle -> Miyapur is roughly 5-6 km.
    d = haversine_m(17.4948, 78.3030, 17.4969, 78.3573)
    assert 4000 < d < 7000
