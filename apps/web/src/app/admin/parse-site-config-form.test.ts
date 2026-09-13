import { describe, expect, test } from "vitest";

import { parseSiteConfigForm } from "./parse-site-config-form";

function validFields(): Readonly<Record<string, string>> {
  return {
    posting: "anyone",
    comments: "anyone",
    signUp: "open",
    region: "US",
    siteName: "The Porch",
    siteTagline: "A place to sit a while",
    aboutMd: "# About",
    anonymousUploadCapFiles: "3",
    anonymousUploadCapBytesPerFile: "2097152",
    probationMaxFileBytes: "5242880",
    probationMaxAccountBytes: "26214400",
    trustedMaxFileBytes: "20971520",
    trustedMaxAccountBytes: "209715200",
    moderationFlagAt: "0.5",
    moderationLockAt: "0.9",
    rawIpRetentionDays: "90",
    autoPromoteAfterApprovedPosts: "",
  };
}

function form(
  fields: Readonly<Record<string, string>>,
  allowlist: readonly string[] = ["png", "pdf"],
): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  for (const extension of allowlist) {
    data.append("attachmentAllowlist", extension);
  }
  return data;
}

describe("parseSiteConfigForm", () => {
  test("a fully filled form parses into a whole snapshot", () => {
    const result = parseSiteConfigForm(form(validFields()));

    expect(result).toEqual({
      ok: true,
      config: {
        posting: "anyone",
        comments: "anyone",
        signUp: "open",
        region: "US",
        siteIdentity: {
          siteName: "The Porch",
          siteTagline: "A place to sit a while",
          aboutMd: "# About",
        },
        attachmentAllowlist: ["png", "pdf"],
        anonymousUploadCap: { files: 3, bytesPerFile: 2097152 },
        attachmentQuotaByTrust: {
          probation: { maxFileBytes: 5242880, maxAccountBytes: 26214400 },
          trusted: { maxFileBytes: 20971520, maxAccountBytes: 209715200 },
        },
        moderationThresholds: { flagAt: 0.5, lockAt: 0.9 },
        rawIpRetentionDays: 90,
        autoPromoteAfterApprovedPosts: null,
      },
    });
  });

  test("a blank auto-promote field is off, a number is the rule", () => {
    const withRule = parseSiteConfigForm(
      form({ ...validFields(), autoPromoteAfterApprovedPosts: "5" }),
    );
    expect(withRule).toMatchObject({
      ok: true,
      config: { autoPromoteAfterApprovedPosts: 5 },
    });
  });

  test("an unknown region is reported", () => {
    expect(parseSiteConfigForm(form({ ...validFields(), region: "Mars" }))).toEqual({
      ok: false,
      field: "region",
    });
  });

  test("a non-integer retention window is reported", () => {
    expect(
      parseSiteConfigForm(form({ ...validFields(), rawIpRetentionDays: "0" })),
    ).toEqual({ ok: false, field: "rawIpRetentionDays" });
  });

  test("a missing quota field is reported", () => {
    const fields = validFields();
    const data = form(fields);
    data.delete("trustedMaxFileBytes");

    expect(parseSiteConfigForm(data)).toEqual({
      ok: false,
      field: "attachmentQuotaByTrust",
    });
  });
});
