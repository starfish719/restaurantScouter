const vision = require('@google-cloud/vision')({
    projectId: process.env.GCP_PROJECT
});

const async = require('async');
const httpcli = require('cheerio-httpcli');

/**
 * Responds to any HTTP request that can provide a "message" field in the body.
 *
 * @param {!Object} req Cloud Function request context.
 * @param {!Object} res Cloud Function response context.
 */
exports.api = function helloWorld (req, res) {

    res.header('Content-Type','application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.body.base64 === undefined) {
        // This is an error case, as "message" is required.
        res.status(400).send('No message defined!');
        return;
    }

    var ret = {
        text: '',
        point: 0,
    };
    const base64 = new Buffer(req.body.base64.split(',')[1], 'base64');
    async.waterfall([
        function (waterCallback) {
            vision.detectText(base64, function (err, text, apiResponse) {
                console.log('text:' + JSON.stringify(text));

                ret.text = text;
                waterCallback(null);
            });
        },
        function (waterCallback) {
            vision.detectSimilar(base64)
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

                        waterCallback(null, '');
                    } else {
                        throw new Error('not found web detection');
                    }
                })
                .catch((err) => {
                    waterCallback(err);
                });
        },
        function (url, waterCallback) {
            if (!url) {
                waterCallback(null, 'success');
            }
            httpcli.fetch(url)
                .then(function (result) {
                    if (result.err) {
                        waterCallback(err, 'err');
                    }

                    const $ = result.$;
                    const score = $('b.tb-rating__val.rdheader-rating__score-val span').text();
                    console.error('restaulant score:' + score);

                    ret.point = score;
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

        res.status(200).send({status: 'success', data: ret});
    });
};