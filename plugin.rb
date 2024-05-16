# frozen_string_literal: true

# name: discourse-chart
# about: Adds Charts in Discourse posts.
# version: 0.0.1
# authors: Joffrey Jaffeux
# url: https://github.com/discourse/discourse-chart

enabled_site_setting :discourse_chart_enabled

register_asset "stylesheets/common/discourse-chart.scss"

register_svg_icon "fas fa-chart-line"

after_initialize do
  on(:reduce_cooked) do |doc, post|
    doc
      .css("div.discourse-chart")
      .each do |chart|
        node = Nokogiri::XML::Node.new("a", doc)
        node.content = I18n.t("discourse_chart_placeholder")
        node["href"] = post.url if post
        node["class"] = "discourse-chart-placeholder"
        chart.replace(node)
      end
  end
end
