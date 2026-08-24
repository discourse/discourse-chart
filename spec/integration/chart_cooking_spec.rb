# frozen_string_literal: true

RSpec.describe "Chart cooking" do
  before { SiteSetting.discourse_chart_enabled = true }

  it "emits a placeholder with the data and attributes for the client to render" do
    post = Fabricate(:post, raw: <<~MD)
        [chart type="bar" title="Sales" labels="a,b"]
        | a | b
        | 1 | 2
        [/chart]
      MD

    expect(post.cooked).to include("discourse-chart is-building is-loading")
    expect(post.cooked).to include('data-type="bar"')
    expect(post.cooked).to include('data-title="Sales"')
    expect(post.cooked).to include('data-labels="a,b"')
    expect(post.cooked).to include("| a | b\n| 1 | 2")
  end

  it "escapes the data, and keeps an attribute inside its quotes" do
    post = Fabricate(:post, raw: "[chart type=\"bar\" title=\"R&D <x>\"]\n| a & <b>\n[/chart]")

    expect(post.cooked).to include("| a &amp; &lt;b&gt;")
    # angle brackets are inert within a quoted value, and the sanitizer leaves
    # them there; what matters is that the value cannot end the attribute
    expect(post.cooked).to include('data-title="R&amp;D <x>"')
    expect(post.cooked).not_to include("<x>>")
  end

  it "cannot be made to break out of an attribute" do
    post =
      Fabricate(:post, raw: "[chart type=\"bar\" title=\"a\\\" onerror=\\\"x\"]\n| a\n[/chart]")

    expect(post.cooked).not_to include("onerror=\"x\"")
  end

  it "falls back to a supported type" do
    post = Fabricate(:post, raw: "[chart type=\"bogus\"]\n| a\n[/chart]")

    expect(post.cooked).to include('data-type="line"')
    expect(post.cooked).not_to include("bogus")
  end

  it "renders a chart that follows a paragraph without a blank line" do
    post = Fabricate(:post, raw: "Results:\n[chart type=\"bar\"]\n| a\n[/chart]")

    expect(post.cooked).to include("<p>Results:</p>")
    expect(post.cooked).to include("discourse-chart")
  end

  it "does not render when the plugin is disabled" do
    SiteSetting.discourse_chart_enabled = false
    post = Fabricate(:post, raw: "[chart type=\"bar\"]\n| a\n[/chart]")

    expect(post.cooked).not_to include("discourse-chart")
  end
end
