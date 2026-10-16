Pod::Spec.new do |s|
  s.name           = 'ChagokWatch'
  s.version        = '1.0.0'
  s.summary        = 'WatchConnectivity bridge for the Chagok watch app'
  s.author         = ''
  s.homepage       = 'https://github.com/novum-lab/chagok'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
