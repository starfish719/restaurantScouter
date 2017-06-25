const vision = require('@google-cloud/vision')({
    projectId: process.env.GCP_PROJECT
});

const storage = require('@google-cloud/storage')({
    projectId: process.env.GCP_PROJECT
});

const async = require('async');
const httpcli = require('cheerio-httpcli');

/**
 * Triggered from a message on a Cloud Storage bucket.
 *
 * @param {!Object} event The Cloud Functions event.
 * @param {!Function} The callback function.
 */
exports.processFile = function(event, callback) {
    const eventData = event.data;
    const file = storage.bucket(eventData.bucket).file(eventData.name);
    if (eventData.resourceState === 'not_exists') {
        console.log(`File ${eventData.name} deleted.`);
        callback();
    } else if (eventData.metageneration === '1') {
        async.waterfall([
            function (waterCallback) {
                vision.detectText(file, function(err, text, apiResponse) {
                    console.log('text:' + JSON.stringify(text));

                    waterCallback(null);
                });
            },
            function (waterCallback) {
                vision.detectSimilar(file)
                    .then((results) => {
                        const webDetection = results[1].responses[0].webDetection;

                        if (webDetection.pagesWithMatchingImages.length) {
                            console.log(`Full matches found: ` + webDetection.pagesWithMatchingImages.length);
                            
                            for (var idx in webDetection.pagesWithMatchingImages) {
                                const pageUrl = webDetection.pagesWithMatchingImages[idx].url;
                                console.log(`  URL: ` + pageUrl);
                                if (pageUrl.indexOf('https://tabelog.com/') === 0) {
                                    waterCallback(null, pageUrl);
                                    return;
                                }
                            }

                            throw new Error('not found target url');
                        } else {
                            throw new Error('not found web detection');
                        }
                    })
                    .catch((err) => {
                        waterCallback(err);
                    });
            },
            function (url, waterCallback) {
                httpcli.fetch(url)
                    .then(function (result) {
                        if (result.err) {
                            waterCallback(err, 'err');
                        }

                        const $ = result.$;
                        const score = $('b.tb-rating__val.rdheader-rating__score-val span').text();
                        console.error('restaulant score:' + score);

                        waterCallback(null, 'success');
                    })
                    .catch((err) => {
                        waterCallback(err);
                    });
            },
        ], function (err, result) {
            if (err) {
                throw err;
            }
            console.log('waterfall all done. ', result);

            callback();
        });
    } else {
        console.log(`File ${eventData.name} metadata updated.`);
        callback();
    }
};