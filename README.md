# Post to GitHub

My first foray into Node.js and AWS lambda in which I try to add content to a GitHub repo.

I deploy my function to Lambda using [Claudia](https://claudiajs.com) cos it's easy-peezy-lemon-squeezy.

## Testing Locally

I use the [aws-lambda-local](https://www.npmjs.com/package/aws-lambda-local) module for local testing as it's small and does just what I need it to do without a bazillion dependencies.

```
$ lambda-local -f functionName [-e event.json] [-c context.json] [-t seconds]
$ lambda-local --function=functionName [--event=event.json] [--context=context.json] [--timeout=seconds]
```


## ANO Stuffs

- https://claudiajs.com/tutorials/hello-world-lambda.html
