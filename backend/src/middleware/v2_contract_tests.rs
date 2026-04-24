use super::*;
use serde_json::json;

#[test]
fn snake_to_camel_converts_compound_keys() {
    assert_eq!(snake_to_camel("first_name"), "firstName");
    assert_eq!(snake_to_camel("alreadyCamel"), "alreadyCamel");
    assert_eq!(snake_to_camel("feature-flags"), "featureFlags");
}

#[test]
fn camel_to_snake_converts_compound_keys() {
    assert_eq!(camel_to_snake("firstName"), "first_name");
    assert_eq!(camel_to_snake("already_snake"), "already_snake");
    assert_eq!(camel_to_snake("featureFlags"), "feature_flags");
}

#[test]
fn wrap_success_response_includes_meta_for_arrays() {
    let wrapped = wrap_success_response(json!([{"id": 1}, {"id": 2}]));
    assert_eq!(wrapped["meta"]["count"], 2);
    assert!(wrapped["data"].is_array());
}
