import { ResponseBase } from "../../../Common/ResponseBase";

// `site_config.sign_up` is `closed`, or `invite` (not active yet, #25): a first sign-in
// found no existing profile and may not create one (SPEC.md §4). Never returned for an
// account that already has a profile — signing back in always works.
export class SignUpClosedResponse extends ResponseBase {}
