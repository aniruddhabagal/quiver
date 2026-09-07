from app.services import overload, versions
from app.services.tool_view import exposed_schema, exposed_tool, outbound_arguments

UP = {
    "name": "create_pull_request",
    "description": "Create a PR",
    "inputSchema": {
        "type": "object",
        "properties": {
            "owner": {"type": "string"},
            "repo": {"type": "string"},
            "draft": {"type": "boolean"},
            "maintainer_can_modify": {"type": "boolean"},
        },
        "required": ["owner", "repo", "draft"],
    },
}


def spec(**over):
    base = {
        "id": "t1",
        "server_id": "s",
        "upstream_name": "create_pull_request",
        "alias": "open_pr",
        "description_override": None,
        "presets": {},
        "hidden_args": [],
        "policy": {"mode": "allow"},
        "enabled": True,
    }
    return {**base, **over}


def test_presets_and_hidden_leave_the_schema_and_fix_required():
    s = exposed_schema(spec(presets={"draft": True}, hidden_args=["maintainer_can_modify"]), UP)
    assert set(s["properties"]) == {"owner", "repo"}
    assert s["required"] == ["owner", "repo"]


def test_required_is_dropped_when_empty():
    s = exposed_schema(spec(presets={"owner": "acme", "repo": "x", "draft": True}), UP)
    assert "required" not in s


def test_description_override_and_alias():
    t = exposed_tool(spec(description_override="Open a draft PR."), UP)
    assert t["name"] == "open_pr" and t["description"] == "Open a draft PR."
    assert exposed_tool(spec(), UP)["description"] == "Create a PR"


def test_missing_upstream_schema_still_yields_an_object():
    assert exposed_schema(spec(), None) == {"type": "object", "properties": {}}


def test_outbound_arguments_strip_hidden_and_apply_presets():
    args, stripped = outbound_arguments(
        spec(presets={"draft": True}, hidden_args=["maintainer_can_modify"]),
        {"owner": "a", "draft": False, "maintainer_can_modify": True},
    )
    assert args == {"owner": "a", "draft": True}
    assert stripped == ["maintainer_can_modify"]


def test_version_summary_and_detail():
    before = [spec(), spec(id="t2", alias="search")]
    after = [spec(description_override="new"), spec(id="t3", alias="query")]
    assert versions.summary(before, after) == {"added": ["query"], "removed": ["search"], "changed": ["open_pr"]}
    d = versions.detailed(before, after)
    assert d["changed"] == [{"alias": "open_pr", "fields": ["description_override"]}]


def test_overload_grows_with_tools_and_never_counts_unused_for_fresh_loadouts():
    manifests = {"s": {"create_pull_request": UP}}
    one = overload.compute({"tools": [spec()]}, manifests, None)
    many = overload.compute({"tools": [spec(id=f"t{i}", alias=f"tool_{i}") for i in range(40)]}, manifests, None)
    assert 0 <= one["score"] < many["score"] <= 100
    assert one["breakdown"]["unused_tools"] == 0
    used = overload.compute({"tools": [spec(), spec(id="t2", alias="other")]}, manifests, {"open_pr"})
    assert used["breakdown"]["unused_tools"] == 1
