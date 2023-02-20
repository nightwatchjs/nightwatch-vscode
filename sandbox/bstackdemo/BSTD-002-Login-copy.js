describe('BSTD 002 - Login', function() {
  it('Login and verify the username', async function(browser) {
    await browser.navigateTo("https://www.bstackdemo.com/");
    let signin = await browser.findElement("#signin");
    browser.click(signin);

    browser
    .sendKeys("#react-select-2-input",["demouser",browser.Keys.ENTER])
    .sendKeys("#react-select-3-input",["testingisfun99",browser.Keys.ENTER])
    .click("#login-btn")
    .assert.textContains("span.username","demouser")
    .assert.urlContains("signin=true")
    .end();
  }); 
});