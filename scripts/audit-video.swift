import Foundation
import AVFoundation
import Vision
import CoreImage

guard CommandLine.arguments.count == 3 else { fatalError("Usage: audit-video.swift video.mp4 report.json") }
let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
guard let track = asset.tracks(withMediaType: .video).first else { fatalError("Video track missing") }
let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData = false
reader.add(output)
guard reader.startReading() else { fatalError("Cannot decode video") }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .fast
request.usesLanguageCorrection = false
request.minimumTextHeight = 0.009
var frame = 0
var changes: [[String: Any]] = []
var previous = ""
while let sample = output.copyNextSampleBuffer() {
    try autoreleasepool {
        guard let buffer = CMSampleBufferGetImageBuffer(sample) else { fatalError("Missing frame pixels") }
        try VNImageRequestHandler(cvPixelBuffer: buffer, options: [:]).perform([request])
        let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
        let text = lines.joined(separator: "\n")
        if text != previous {
            changes.append(["frame": frame, "seconds": CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample)), "text": text])
            previous = text
        }
        frame += 1
    }
}
guard reader.status == .completed else { fatalError("Video decoding did not complete") }
let report: [String: Any] = ["frames": frame, "everyFrameDecodedAndTextScanned": true, "recognizer": "Apple Vision fast text", "limitations": "Text recognition supplements visual inspection; it does not recognize every graphical trademark.", "textChanges": changes]
let data = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
let target = URL(fileURLWithPath: CommandLine.arguments[2])
try data.write(to: target)
try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: target.path)
print("Decoded and text-scanned \(frame) frames; inspect changed visual states before publishing.")
